import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { MAKERS, BODY_TYPES } from '@/lib/constants';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active');

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/listings`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const makerPages: MetadataRoute.Sitemap = Object.keys(MAKERS).map((maker) => ({
    url: `${BASE}/makers/${encodeURIComponent(maker)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const bodyPages: MetadataRoute.Sitemap = BODY_TYPES.map((body) => ({
    url: `${BASE}/body/${encodeURIComponent(body)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${BASE}/listings/${l.id}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...makerPages, ...bodyPages, ...listingPages];
}
