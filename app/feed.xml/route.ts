// BUYMO コラムの RSS 2.0 フィード（/feed.xml）。
// 目的: Zapier の無料トリガー「RSS by Zapier」でこのフィードを監視し、
//       新着コラムを Instagram 等へ自動投稿する（Webhook=Premium を使わずに済む）。
//
// 各 item には画像（enclosure / media:content）を入れてあるため、
// Zapier 側で「Media URL」をそのまま Instagram の写真にマッピングできる。
//
// 構成: AI自動生成コラム（DB・日付あり）を新しい順に先頭へ。
//       静的な常設コラム（日付なし）は古い固定日付を割り当て、
//       初回接続時に大量投稿されないようにする（新着=DBコラムのみがトリガー対象）。
import { loadDbColumns } from '@/lib/columns-db';
import { COLUMNS, columnThumb } from '@/lib/columns';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me').replace(/\/$/, '');

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** HTMLタグを除き、プレーンな説明文にする（先頭 label も除去）。 */
function toPlain(html: string, max = 300): string {
  const t = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/結論：/g, '結論：')
    .trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

/** 画像URLを絶対URLで返す。 */
function absImage(thumbUrl: string | null, cat: string): string {
  if (thumbUrl && /^https?:\/\//.test(thumbUrl)) return thumbUrl;
  return `${SITE}${columnThumb(cat)}`;
}

/** 画像の content-type を拡張子から推定（enclosure の type 用）。 */
function imageType(url: string): string {
  if (/\.png(\?|$)/i.test(url)) return 'image/png';
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
  return 'image/jpeg';
}

function rfc822(d: Date): string {
  return d.toUTCString();
}

export async function GET() {
  const db = await loadDbColumns(50);

  type Item = {
    slug: string;
    title: string;
    desc: string;
    cat: string;
    image: string;
    date: Date;
  };

  const items: Item[] = [];

  // 1) AI自動生成コラム（新しい順・公開日あり）
  for (const c of db) {
    items.push({
      slug: c.slug,
      title: c.title,
      desc: c.meta || toPlain(c.html),
      cat: c.cat,
      image: absImage(c.thumb_url, c.cat),
      date: new Date(c.published_at),
    });
  }

  // 2) 静的な常設コラム（古い固定日付。初回の一斉投稿を防ぐ）
  const base = new Date('2024-01-01T00:00:00Z').getTime();
  COLUMNS.forEach((c, i) => {
    items.push({
      slug: c.slug,
      title: c.title,
      desc: c.meta || toPlain(c.html),
      cat: c.cat,
      image: absImage(null, c.cat),
      date: new Date(base + i * 60_000), // それぞれ1分ずつずらす
    });
  });

  // 新しい順
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  const lastBuild = items[0]?.date ?? new Date();

  const xmlItems = items
    .map((it) => {
      const link = `${SITE}/column/${it.slug}`;
      const type = imageType(it.image);
      return [
        '    <item>',
        `      <title>${esc(it.title)}</title>`,
        `      <link>${esc(link)}</link>`,
        `      <guid isPermaLink="true">${esc(link)}</guid>`,
        `      <pubDate>${rfc822(it.date)}</pubDate>`,
        `      <category>${esc(it.cat)}</category>`,
        `      <description>${esc(it.desc)}</description>`,
        `      <enclosure url="${esc(it.image)}" type="${type}" length="0" />`,
        `      <media:content url="${esc(it.image)}" medium="image" type="${type}" />`,
        `      <media:thumbnail url="${esc(it.image)}" />`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>BUYMO ダイレクト｜中古車の売買コラム</title>
    <link>${esc(SITE)}/column</link>
    <description>中古車の買取・ダイレクト販売に役立つ最新コラムを毎日お届け（BUYMO ダイレクト／合同会社アイズ）。</description>
    <language>ja</language>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
${xmlItems}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
