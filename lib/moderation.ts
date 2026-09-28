// プラットフォーム外への連絡先・直接取引誘導の検知とマスキング（ルールベース）。
// AIキー不要で動作。将来 AI スコアリングと併用する土台。

export interface ModerationResult {
  level: 0 | 1 | 2 | 3;   // 0=問題なし 1=注意 2=違反疑い 3=重大
  reasons: string[];      // 検知理由（本部確認用）
  masked: string;         // 相手に表示する用にマスクした本文
  flagged: boolean;       // level>=1
}

const MASK = '〔連絡先は安全のため運営が保護しました〕';

// メール
const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// URL
const RE_URL = /((https?:\/\/)|(www\.))[^\s　]+/gi;
// 電話番号（日本／ハイフン・全角対応、数字10〜11桁相当）
const RE_PHONE = /(\+?81|0)[\d\-‐ー－―\s()]{8,14}\d/g;
// LINE / SNS ID 誘導
const RE_LINE = /(line|ライン)[\s:：]*((id|アカウント|@|交換)[^\s]*)?/gi;
const RE_HANDLE = /(?<![A-Za-z0-9._%+-])@[A-Za-z0-9_.]{3,}/g; // @handle（メール以外）
const RE_SNS = /(instagram|insta|インスタ|twitter|ツイッター|ｘ（旧twitter）|tiktok|telegram|whatsapp|カカオ|kakao)/gi;

// 手数料回避・直接取引の誘導表現（重大）
const RE_FEE_AVOID = /(手数料[^。\n]{0,6}(かからない|払わ|不要|節約|浮く))|(buymo|バイモ)[^。\n]{0,10}(通さ|使わ|外)[^。\n]{0,4}(ず|ない|で)|(直接[^。\n]{0,4}(取引|やり|連絡|お願い|振込|現金))|(現金[^。\n]{0,4}(直接|手渡し))|(こちら[^。\n]{0,6}(連絡|電話|メール))/gi;

function count(re: RegExp, text: string): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** 本文を解析し、レベル・理由・マスク済み本文を返す。 */
export function analyzeMessage(text: string): ModerationResult {
  const reasons: string[] = [];
  let level: 0 | 1 | 2 | 3 = 0;

  const hasEmail = count(RE_EMAIL, text) > 0;
  const hasUrl = count(RE_URL, text) > 0;
  const hasPhone = count(RE_PHONE, text) > 0;
  const hasLine = count(RE_LINE, text) > 0;
  const hasHandle = count(RE_HANDLE, text) > 0;
  const hasSns = count(RE_SNS, text) > 0;
  const hasFeeAvoid = count(RE_FEE_AVOID, text) > 0;

  if (hasEmail) reasons.push('メールアドレスの送信');
  if (hasUrl) reasons.push('外部URLの送信');
  if (hasPhone) reasons.push('電話番号らしき記載');
  if (hasLine) reasons.push('LINEの誘導');
  if (hasSns) reasons.push('SNSの誘導');
  if (hasHandle) reasons.push('外部アカウント(@)の記載');
  if (hasFeeAvoid) reasons.push('プラットフォーム外・手数料回避の誘導表現');

  if (hasFeeAvoid) level = 3;                                   // 重大：手数料回避/直接取引
  else if (hasEmail || hasUrl || hasPhone || hasLine || hasSns) level = 2; // 明確な外部連絡先
  else if (hasHandle) level = 1;                               // 軽微：@表記のみ

  const masked = maskContacts(text);
  return { level, reasons, masked, flagged: level >= 1 };
}

/** 外部連絡先を伏せ字化。 */
export function maskContacts(text: string): string {
  return text
    .replace(RE_EMAIL, MASK)
    .replace(RE_URL, MASK)
    .replace(RE_PHONE, MASK)
    .replace(RE_LINE, MASK)
    .replace(RE_HANDLE, MASK)
    .trim();
}
