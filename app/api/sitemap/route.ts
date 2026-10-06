import { createServiceClient } from '@/lib/supabase/service';
import { COLUMNS, COLUMN_CATEGORIES } from '@/lib/columns';
import { MAKERS } from '@/lib/constants';
import { AREAS, GENRES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

function url(loc: string, changefreq: string, priority: string, lastmod?: string) {
  return `<url><loc>${BASE}${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
}

export async function GET() {
  const supabase = createServiceClient();
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(5000);

  const { data: dealers } = await (supabase as any)
    .from('dealers')
    .select('id, updated_at')
    .eq('status', 'approved');

  const staticPages = [
    url('/', 'daily', '1.0'),
    url('/listings', 'hourly', '0.9'),
    url('/listings/map', 'daily', '0.6'),
    url('/listings/valuation', 'weekly', '0.8'),
    url('/dealers', 'daily', '0.8'),
    url('/dealer', 'weekly', '0.6'),
    url('/genre', 'weekly', '0.7'),
    url('/area', 'weekly', '0.7'),
    url('/compare', 'monthly', '0.4'),
    // サービス・ガイド
    url('/about', 'monthly', '0.8'),
    url('/questions', 'monthly', '0.7'),
    url('/sell', 'weekly', '0.8'),
    url('/sell/wizard', 'weekly', '0.6'),
    url('/sell/omakase', 'monthly', '0.7'),
    url('/transfer', 'monthly', '0.7'),
    url('/escrow', 'monthly', '0.7'),
    url('/transport', 'monthly', '0.5'),
    url('/loan/apply', 'monthly', '0.5'),
    url('/join', 'monthly', '0.5'),
    url('/documents/necessary', 'monthly', '0.7'),
    url('/documents/pictures', 'monthly', '0.7'),
    url('/column', 'weekly', '0.7'),
    // 会社・法務
    url('/company', 'monthly', '0.4'),
    url('/contact', 'monthly', '0.4'),
    url('/privacy', 'yearly', '0.2'),
    url('/terms', 'yearly', '0.2'),
    url('/tokushoho', 'yearly', '0.2'),
    url('/login', 'monthly', '0.3'),
    url('/signup', 'monthly', '0.3'),
  ];

  // コラム（記事・カテゴリ）
  const columnUrls = [
    ...COLUMNS.map((c) => url(`/column/${c.slug}`, 'monthly', '0.6')),
    ...COLUMN_CATEGORIES.map((cat) => url(`/column/category/${encodeURIComponent(cat)}`, 'monthly', '0.5')),
  ];

  // メーカー・エリア・ジャンル（プログラマティックSEO）
  const makerUrls = Object.keys(MAKERS)
    .filter((m) => m !== 'その他')
    .map((m) => url(`/makers/${encodeURIComponent(m)}`, 'weekly', '0.6'));
  const areaUrls = AREAS.map((a) => url(`/area/${a.slug}`, 'weekly', '0.6'));
  const genreUrls = GENRES.map((g) => url(`/genre/${g.slug}`, 'weekly', '0.6'));

  const listingUrls = (listings ?? []).map((l: any) =>
    url(`/listings/${l.id}`, 'weekly', '0.7', l.updated_at?.slice(0, 10))
  );

  const dealerUrls = (dealers ?? []).map((d: any) =>
    url(`/dealers/${d.id}`, 'daily', '0.7', d.updated_at?.slice(0, 10))
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...columnUrls, ...makerUrls, ...areaUrls, ...genreUrls, ...listingUrls, ...dealerUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
