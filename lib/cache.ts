import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { ListingWithImages } from './types';

/**
 * Lightweight public Supabase client (no cookie auth).
 * Safe to call inside unstable_cache because it has no request-scope dependencies.
 */
function makePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Total number of active listings — cached for 1 hour. */
export const getCachedListingStats = unstable_cache(
  async () => {
    const supabase = makePublicClient();
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    return { count: count ?? 0 };
  },
  ['listing-stats'],
  { revalidate: 3600 }
);

/** Top 8 most-recent active listings for the home page — cached for 5 minutes. */
export const getCachedFeaturedListings = unstable_cache(
  async () => {
    const supabase = makePublicClient();
    const { data } = await supabase
      .from('listings')
      .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8);
    return (data ?? []) as unknown as ListingWithImages[];
  },
  ['featured-listings'],
  { revalidate: 300 }
);
