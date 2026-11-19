/**
 * AI電話の「折り返し予約」フロー（着信→用件→お名前→希望時間→確認→予約）。
 * 通話ログからスロット（用件・お名前・希望時間・確認）を抽出し（haiku）、
 * 不足はTS側で決定的に聞き返す。全部揃って同意が取れたら voice_bookings に保存。
 */
import { generateWithClaude, isAiEnabled } from '@/lib/ai';
import { loadVoiceTurns, saveVoiceTurn } from '@/lib/voice-data';
import { getVoiceSettings } from '@/lib/voice-settings';
import { createServiceClient } from '@/lib/supabase/service';

export type BookingCategory = 'appraisal' | 'repair' | 'purchase' | 'other';

export type BookingState = {
  intent: 'booking' | 'question' | 'end';
  category: BookingCategory | null;
  name: string | null;
  preferred: string | null;
  vehicle: string | null;
  confirmed: boolean;
};

export const CATEGORY_LABEL: Record<BookingCategory, string> = {
  appraisal: '査定・買取',
  repair: '故障・修理',
  purchase: 'ご購入のご相談',
  other: 'ご相談',
};

const EXTRACT_SYSTEM = [
  'あなたは電話予約の情報抽出器です。中古車「バイモ ダイレクト」の電話対応ログから、折り返し予約に必要な情報だけを抽出します。',
  '出力は必ず次のキーだけを持つJSONオブジェクトのみ。前後に説明・記号・コードブロックを付けない。',
  '{"intent":"booking|question|end","category":"appraisal|repair|purchase|other|null","name":"文字列|null","preferred":"文字列|null","vehicle":"文字列|null","confirmed":true|false}',
  'intent: お客様が予約・折り返し・査定・修理など「対応」を希望していれば booking。単なる質問は question。通話終了の合図は end。',
  'category: 査定や買取=appraisal、故障や修理=repair、購入の相談=purchase、それ以外=other。不明は null。',
  'name: お客様が名乗ったお名前（姓だけでも可）。不明は null。',
  'preferred: 折り返し希望の日時。「明日の午後」など言われたまま自由文で。不明は null。',
  'vehicle: 車種や車の状況があれば。なければ null。',
  'confirmed: 直前に案内役が復唱した予約内容に対して、お客様が「はい」等で明確に同意していれば true。まだなら false。',
].join('\n');

/** 通話ログ＋最新発話からスロット状態を抽出。AI未設定・失敗時は null。 */
export async function extractBooking(callSid: string, latestUserText: string): Promise<BookingState | null> {
  if (!isAiEnabled()) return null;
  try {
    const turns = await loadVoiceTurns(callSid, 24);
    const lines = turns.map((t) => `${t.role === 'assistant' ? '案内' : 'お客様'}: ${t.content}`);
    lines.push(`お客様: ${latestUserText}`);
    const prompt = `通話ログ:\n${lines.join('\n')}\n\n上記からJSONのみを出力してください。`;
    const raw = await generateWithClaude(prompt, EXTRACT_SYSTEM, undefined, 300);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as Record<string, unknown>;
    const cat = (['appraisal', 'repair', 'purchase', 'other'] as const).find((c) => c === j.category) ?? null;
    const intent = (['booking', 'question', 'end'] as const).find((i) => i === j.intent) ?? 'question';
    const str = (v: unknown, max: number): string | null =>
      typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, max) : null;
    return {
      intent,
      category: cat,
      name: str(j.name, 40),
      preferred: str(j.preferred, 80),
      vehicle: str(j.vehicle, 80),
      confirmed: j.confirmed === true,
    };
  } catch {
    return null;
  }
}

/** 必要スロットが揃っているか。 */
export function bookingComplete(s: BookingState): boolean {
  return !!(s.category && s.name && s.preferred);
}

/** 次に読み上げる案内（不足スロットを聞く／揃っていれば復唱して確認）。 */
export function nextBookingPrompt(s: BookingState): string {
  if (!s.category) return 'ご用件をうかがえますか。お車の査定・買取、故障や修理、ご購入のご相談、いずれでしょうか。';
  if (!s.name) return '承知しました。恐れ入りますが、お名前を頂戴できますか。';
  if (!s.preferred) {
    return `ありがとうございます${s.name ? '、' + s.name + '様' : ''}。折り返しのご希望のお時間はございますか。たとえば、本日の午後や、明日の午前などで。`;
  }
  return `確認いたします。${s.name}様、${CATEGORY_LABEL[s.category]}の件で、ご希望は「${s.preferred}」ですね。この内容で、担当者より折り返しのご予約を承ります。よろしければ「はい」とお願いいたします。`;
}

/** 予約確定時の読み上げ。 */
export function bookingConfirmation(s: BookingState): string {
  const cat = s.category ? CATEGORY_LABEL[s.category] : 'ご相談';
  const when = s.preferred ? `${s.preferred}ごろに` : '追って';
  return `ありがとうございます。${s.name ?? 'お客'}様、${cat}の件で、${when}担当者よりお電話を差し上げます。ご予約を承りました。お電話ありがとうございました。`;
}

// ───────────────────────────────────────────────────────────────
// 高機能オペレーター：1ターン＝AI1回で「話す言葉」と「予約状態」を同時に返す。
// 2回呼び出し（抽出＋返答）をやめることで応答を高速化し、Twilioのタイムアウト切断を防ぐ。
// ───────────────────────────────────────────────────────────────

const OPERATOR_SYSTEM = [
  'あなたは中古車「バイモ ダイレクト」（合同会社アイズ）の電話AIオペレーターです。相手は電話をかけてきたお客様です。',
  'バイモは中古車の「買取」と「ダイレクト販売（買取保証つき）」を扱い、エスクロー決済・名義変更代行・全国対応・明朗な手数料が特徴です。',
  '最大の目的は、ご用件をうかがって「折り返しのご予約」を取ること。必要情報は ①ご用件(category) ②お名前(name) ③折り返し希望の時間(preferred) の3つ。',
  '進め方：不足している項目を1つずつ、自然な会話で尋ねる（目安は 用件→お名前→希望時間）。一度に全部聞かない。',
  '3項目が揃ったら、sayで内容を短く復唱し「よろしければ、はい とおっしゃってください」と確認する。このとき readyToBook は false のまま。',
  'お客様が「はい」「お願いします」等で同意したら readyToBook を true にし、sayはお礼と「担当者より折り返します」の一言にする。',
  '質問だけされたら、sayで1〜2文で簡潔に答え、続けて予約に必要な次の項目を1つだけ尋ねる。',
  'お客様がお礼や「以上です」「大丈夫です」等で終わりたい様子なら end を true にし、sayは丁寧な締めの挨拶にする。',
  '電話の音声なので say は必ず1〜2文・短く・話し言葉。箇条書き・記号・URL・長い説明は使わない。数字や金額は聞き取りやすく。',
  '住所やカード番号など詳しい個人情報は電話で聞き出さない。手続きはウェブの無料査定やお問い合わせへご案内する。',
  '出力は必ず次のJSONオブジェクトのみ。前後に説明・記号・コードブロックを付けない。',
  '{"say":"お客様へ読み上げる1〜2文","category":"appraisal|repair|purchase|other|null","name":"文字列|null","preferred":"文字列|null","vehicle":"文字列|null","readyToBook":true|false,"end":true|false}',
  'category: 査定や買取=appraisal、故障や修理=repair、購入の相談=purchase、それ以外=other、不明は null。',
].join('\n');

// AIが電話口でよくある質問に正確に答えるための、BUYMOの基本事実（組み込みの豆知識）。
// 具体の金額・在庫・審査結果などは電話で断定せず、ウェブや折り返しへ案内する。
const BUILTIN_KNOWLEDGE = [
  '【バイモ ダイレクトの基本】',
  '・中古車の「買取」と「ダイレクト販売（買取保証つきの個人間売買）」を提供。',
  '・買取保証つき：ダイレクト販売で売れ残っても、最後はバイモが買い取るので安心。',
  '・エスクロー（代金お預かり）決済で、売り手・買い手の双方が安全に取引できる。',
  '・名義変更（移転登録）はバイモが代行。全国対応で、出張査定や陸送も相談可能。',
  '・出品手数料は無料。手数料は明朗で、販売価格から一定の手数料のみ。',
  '・ウェブの「無料査定」は、写真を撮るだけでAIが査定額の目安をすぐ提示（24時間受付）。',
  '・廃車・事故車・不動車は「その場提示」の買取にも対応。',
  '・ローンや故障保証のご相談も可能（審査・金額の確定は担当者がご案内）。',
  '【電話での答え方】質問にはこの事実の範囲で1〜2文で答える。具体的な査定額・在庫・審査可否・個別料金は電話で断定せず、ウェブの無料査定か折り返しへご案内する。',
].join('\n');

/** 折り返しの再来・常連判定：同じ電話番号の直近予約があれば、短い文脈メモを返す。 */
async function recentCallerContext(from: string | undefined): Promise<string> {
  if (!from) return '';
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('voice_bookings')
      .select('name, category, created_at')
      .eq('phone', from)
      .order('created_at', { ascending: false })
      .limit(1);
    const r = (data ?? [])[0] as { name?: string | null; category?: string | null } | undefined;
    if (!r) return '';
    const cat = r.category ? (CATEGORY_LABEL as Record<string, string>)[r.category] : '';
    const who = r.name ? `${r.name}様` : 'このお客様';
    return `\n【発信者メモ】この電話番号には過去のご予約履歴があります（${who}${cat ? '／' + cat : ''}）。分かっている情報は聞き直さず自然に対応し、「いつもありがとうございます」等を一言添える。ただし本人確認が曖昧なら丁寧に確認する。`;
  } catch {
    return '';
  }
}

/** Promiseにタイムアウトを付ける（遅延で通話が切れる前に打ち切って聞き直す）。 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const sliceStr = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, max) : null;

/**
 * 1発話に対する応答を返す。AIが「読み上げる言葉(say)」と予約スロットを同時に出力。
 * finished=true のときは say を読み上げて通話を終了する（予約確定 or 締め）。
 * 失敗・遅延時も通話は切らず、聞き直して継続する。
 */
export async function operatorTurn(
  callSid: string,
  userText: string,
  from: string | undefined,
): Promise<{ say: string; finished: boolean }> {
  const REPROMPT = 'すみません、お電話が少し遠いようです。もう一度、ゆっくりお願いできますか。';
  if (!isAiEnabled()) {
    return {
      say: 'ただいまAIの準備中です。恐れ入りますが、ウェブサイトのお問い合わせか、無料査定をご利用ください。失礼いたします。',
      finished: true,
    };
  }
  try {
    // 管理画面の設定（追加指示・営業時間・豆知識）＋発信者メモをシステムプロンプトに反映
    const [vs, callerNote] = await Promise.all([getVoiceSettings(), recentCallerContext(from)]);
    const sys =
      OPERATOR_SYSTEM +
      '\n\n' + BUILTIN_KNOWLEDGE +
      (vs.knowledge ? `\n【運営が登録した豆知識（事実として優先的に使う）】\n${vs.knowledge}` : '') +
      (vs.instructions ? `\n【運営からの追加指示（最優先で従う）】\n${vs.instructions}` : '') +
      (vs.hours ? `\n【営業時間】お客様に営業時間や受付時間を聞かれたら、次の内容で案内する：${vs.hours}` : '') +
      callerNote;
    const turns = await loadVoiceTurns(callSid, 20);
    const lines = turns.map((t) => `${t.role === 'assistant' ? '案内' : 'お客様'}: ${t.content}`);
    lines.push(`お客様: ${userText}`);
    const prompt = `通話ログ:\n${lines.join('\n')}\n\nJSONのみを出力してください。`;
    const raw = await withTimeout(generateWithClaude(prompt, sys, undefined, 320), 9000);
    const m = raw.match(/\{[\s\S]*\}/);
    const j = (m ? JSON.parse(m[0]) : {}) as Record<string, unknown>;
    const line = sliceStr(j.say, 400) ?? REPROMPT;
    const category = (['appraisal', 'repair', 'purchase', 'other'] as const).find((c) => c === j.category) ?? null;
    const state: BookingState = {
      intent: 'booking',
      category,
      name: sliceStr(j.name, 40),
      preferred: sliceStr(j.preferred, 80),
      vehicle: sliceStr(j.vehicle, 80),
      confirmed: j.readyToBook === true,
    };
    // 会話メモリへ保存（文脈維持と「はい」の同意判定のため）
    await saveVoiceTurn(callSid, 'user', userText);
    await saveVoiceTurn(callSid, 'assistant', line);

    if (j.end === true) return { say: line, finished: true };
    if (state.confirmed && state.category && state.name && state.preferred) {
      await saveVoiceBooking(callSid, from, state);
      return { say: line, finished: true };
    }
    return { say: line, finished: false };
  } catch {
    // タイムアウト/生成失敗でも通話は切らず、聞き直して継続する
    return { say: REPROMPT, finished: false };
  }
}

/** 予約を1件保存（ベストエフォート。テーブル未作成でも通話は継続）。 */
export async function saveVoiceBooking(callSid: string, from: string | undefined, s: BookingState): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('voice_bookings').insert({
      call_sid: callSid || null,
      phone: from || null,
      category: s.category,
      name: s.name,
      preferred: s.preferred,
      vehicle: s.vehicle,
      status: 'new',
    });
  } catch {
    /* 保存失敗は無視（通話は続行） */
  }
}
