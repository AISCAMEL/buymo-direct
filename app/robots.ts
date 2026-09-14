import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/escrow/',
          '/api/',
          '/messages/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
