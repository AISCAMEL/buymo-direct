import { chatWithClaude, toPlainText, isAiEnabled, type ChatTurn } from '@/lib/ai';
import { loadVoiceTurns, saveVoiceTurn } from '@/lib/voice-data';

/** 電話の最初の挨拶（AIが話す第一声）。 */
export function voiceGreeting(): string {
  return 'お電話ありがとうございます。中古車のバイモダイレクト、AI音声案内です。買取や販売、査定、お手続きなど、ご用件をお話しください。';
}

/** 聞き取れなかったときの再プロンプト。 */
export function voiceReprompt(): string {
  return 'すみません、うまく聞き取れませんでした。もう一度、ご用件をお話しください。';
}

/** 終了の合図かどうか（簡易判定）。 */
export function isGoodbye(text: string): boolean {
  const t = (text || '').replace(/\s/g, '');
  return /(ありがとう|だいじょうぶ|大丈夫|けっこうです|結構です|おわり|終わり|さようなら|バイバイ|切りま|以上です)/.test(t);
}

const VOICE_SYSTEM = [
  'あなたは中古車マーケットプレイス「バイモ ダイレクト」（合同会社アイズ）の電話AIオペレーターです。相手は電話をかけてきたお客様です。',
  'バイモは中古車の「買取」と「ダイレクト販売（買取保証つきの個人間売買）」を提供し、エスクロー決済・名義変更代行・全国対応・明朗な手数料が特徴です。',
  '電話の音声なので、回答は【1〜2文・短く・話し言葉】で。箇条書きや記号、URL、長い説明は読み上げに向かないので使わない。数字や金額は聞き取りやすく。',
  'まず相手の用件を1つずつ確認し、要点だけ答える。わからないことは推測せず、「担当者からの折り返し」や「ウェブの無料査定・お問い合わせ」をご案内する。',
  '個人情報（名前・住所・カード番号など）を電話で詳しく聞き出さない。手続きが必要なら、ウェブの無料査定フォームやお問い合わせへご案内し、そこで入力してもらう。',
  '最後は「他にご質問はありますか？」のように、会話を自然に続けるか締める。丁寧だがフレンドリーに。',
].join('\n');

/**
 * 通話中の1発話に対してAIの応答テキストを返す。
 * 会話メモリ（voice_turns）があれば文脈を踏まえる。キー未設定時は定型文。
 */
export async function voiceReply(callSid: string, userText: string): Promise<string> {
  if (!isAiEnabled()) {
    return 'ただいまAIの準備中です。恐れ入りますが、ウェブサイトのお問い合わせか、無料査定をご利用ください。';
  }
  try {
    const history = await loadVoiceTurns(callSid);
    const turns: ChatTurn[] = [...history, { role: 'user', content: userText }];
    const raw = await chatWithClaude(turns, VOICE_SYSTEM, { maxTokens: 400 });
    const reply = toPlainText(raw).slice(0, 500);
    // 会話メモリに保存（ベストエフォート）
    await saveVoiceTurn(callSid, 'user', userText);
    await saveVoiceTurn(callSid, 'assistant', reply);
    return reply || 'すみません、もう一度お願いできますか？';
  } catch {
    return '申し訳ありません、うまくお答えできませんでした。お手数ですが、ウェブのお問い合わせからご連絡ください。';
  }
}
