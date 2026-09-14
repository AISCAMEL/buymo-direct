import { createServiceClient } from '@/lib/supabase/service';

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
    url('/dealers', 'daily', '0.8'),
    url('/dealer', 'weekly', '0.6'),
    url('/login', 'monthly', '0.3'),
    url('/signup', 'monthly', '0.3'),
  ];

  const listingUrls = (listings ?? []).map((l: any) =>
    url(`/listings/${l.id}`, 'weekly', '0.7', l.updated_at?.slice(0, 10))
  );

  const dealerUrls = (dealers ?? []).map((d: any) =>
    url(`/dealers/${d.id}`, 'daily', '0.7', d.updated_at?.slice(0, 10))
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...listingUrls, ...dealerUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
