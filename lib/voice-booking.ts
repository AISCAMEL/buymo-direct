/**
 * AI電話の「折り返し予約」フロー。
 * 通話ログからスロット（用件・お名前・希望時間・確認）を抽出し（haiku）、
 * 不足はTS側で決定的に聞き返す。全部揃って同意が取れたら voice_bookings に保存。
 */
import { generateWithClaude, isAiEnabled } from '@/lib/ai';
import { loadVoiceTurns } from '@/lib/voice-data';
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
