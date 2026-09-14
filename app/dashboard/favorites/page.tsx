import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/ListingGrid';
import type { ListingWithImages } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/favorites');

  const { data } = await supabase
    .from('favorites')
    .select('created_at, listings(*, listing_images(*), profiles(id, display_name, prefecture, avatar_url))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const listings = ((data ?? []) as any[])
    .map((row) => row.listings)
    .filter(Boolean) as ListingWithImages[];
  const favoritedIds = new Set(listings.map((l) => l.id));

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-black">
        <Heart className="h-6 w-6 fill-red-500 text-red-500" /> お気に入り
      </h1>
      {listings.length > 0 ? (
        <ListingGrid listings={listings} favoritedIds={favoritedIds} loggedIn />
      ) : (
        <div className="card p-10 text-center text-sm text-slate-500">
          お気に入りはまだありません。気になる車両のハートをタップして保存しましょう。
          <div className="mt-4"><Link href="/listings" className="btn-primary">車を探す</Link></div>
        </div>
      )}
    </div>
  );
}
