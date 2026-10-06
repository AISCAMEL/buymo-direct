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
    .select('created_at, price_at_save, listings(*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as any[];
  const listings = rows.map((row) => row.listings).filter(Boolean) as ListingWithImages[];
  const favoritedIds = new Set(listings.map((l) => l.id));

  // お気に入り登録時からの値下げ額（円）
  const priceDrops: Record<string, number> = {};
  for (const row of rows) {
    const l = row.listings;
    if (l && row.price_at_save != null) {
      const drop = Number(row.price_at_save) - Number(l.price);
      if (drop > 0) priceDrops[l.id] = drop;
    }
  }
  const dropCount = Object.keys(priceDrops).length;

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-black">
        <Heart className="h-6 w-6 fill-red-500 text-red-500" /> お気に入り
      </h1>
      {dropCount > 0 && (
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
          <Heart className="h-4 w-4" />お気に入り{dropCount}台が値下げされました
        </p>
      )}
      {listings.length > 0 ? (
        <ListingGrid listings={listings} favoritedIds={favoritedIds} loggedIn priceDrops={priceDrops} />
      ) : (
        <div className="card p-10 text-center text-sm text-slate-500">
          お気に入りはまだありません。気になる車両のハートをタップして保存しましょう。
          <div className="mt-4"><Link href="/listings" className="btn-primary">車を探す</Link></div>
        </div>
      )}
    </div>
  );
}
