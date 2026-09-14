export function GET() {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const txt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /escrow/
Disallow: /messages/
Disallow: /dealer/
Disallow: /demo/

Sitemap: ${BASE}/sitemap.xml`;

  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
