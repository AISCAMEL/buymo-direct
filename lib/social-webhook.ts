// SNS自動投稿（Zapier連携）。
// 新着コラムを Zapier の Catch Hook へ通知し、ZapierがInstagram/X/Facebook等へ投稿する。
//
// 環境変数:
//   ZAPIER_COLUMN_WEBHOOK_URL … ZapierのCatch HookのURL（未設定なら何もしない）
//
// Zapier側の設定：Trigger「Webhooks by Zapier → Catch Hook」→ Action「Instagram等へ投稿」。
// payload のフィールド（brand / title / url / image_url / caption / hashtags_text など）を各SNSにマッピング。

export type ColumnSocialPayload = {
  brand: string;        // "BUYMO" など（ブランド横展開用。Zapier側でフィルタ可能）
  slug: string;
  title: string;
  url: string;          // 記事URL
  image_url: string;    // 投稿画像の公開URL
  caption: string;      // 本文キャプション
  hashtags: string[];   // ["中古車", ...]（#なし）
  category: string;
};

/** 新着コラムをZapierへ通知（SNS自動投稿）。未設定・失敗でも例外は投げない。 */
export async function postColumnToZapier(p: ColumnSocialPayload): Promise<{ sent: boolean; error?: string }> {
  const url = process.env.ZAPIER_COLUMN_WEBHOOK_URL;
  if (!url) return { sent: false };
  try {
    const hashtagsText = p.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ');
    const captionFull = [p.caption, hashtagsText, p.url].filter(Boolean).join('\n\n');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...p,
        hashtags_text: hashtagsText,     // "#中古車 #車買取 ..."（そのまま使える形）
        caption_full: captionFull,       // キャプション＋タグ＋URL（Instagram等にそのまま）
        posted_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) return { sent: false, error: `HTTP ${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'webhook失敗' };
  }
}
