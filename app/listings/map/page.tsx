import Link from 'next/link';
import { ArrowLeft, List } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MapListings } from '@/components/MapListings';
import { PREFECTURE_COORDS } from '@/lib/constants';
import type { PrefectureGroup } from '@/components/MapListings';

export const dynamic = 'force-dynamic';
export const metadata = { title: '地図で探す' };

export default async function MapPage() {
  const supabase = await createClient();

  // 公開中の出品を全件取得（最大 1000 件）
  const { data } = await supabase
    .from('listings')
    .select('id, title, maker, model, price, year, prefecture, listing_images(url, sort_order)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1000);

  const listings = (data ?? []) as any[];

  // 都道府県ごとにグループ化
  const prefMap = new Map<string, PrefectureGroup>();
  for (const l of listings) {
    const pref = l.prefecture as string;
    const coords = PREFECTURE_COORDS[pref];
    if (!coords) continue;

    if (!prefMap.has(pref)) {
      prefMap.set(pref, { prefecture: pref, coords, count: 0, listings: [] });
    }
    const group = prefMap.get(pref)!;
    group.count++;

    if (group.listings.length < 5) {
      const images = [...(l.listing_images ?? [])].sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );
      group.listings.push({
        id: l.id,
        title: l.title,
        maker: l.maker,
        model: l.model,
        price: l.price,
        year: l.year,
        coverUrl: images[0]?.url ?? null,
      });
    }
  }

  const groups = Array.from(prefMap.values());
  const total = listings.length;

  return (
    <div className="-mx-4 -mt-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* ヘッダーバー */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/listings" className="flex items-center gap-1 text-sm font-bold text-navy-500 hover:underline">
            <ArrowLeft className="h-4 w-4" /> リスト表示
          </Link>
          <span className="text-sm text-slate-500">
            全国 <span className="font-bold text-navy-700">{total}</span> 件の出品中
          </span>
        </div>
        <Link href="/listings" className="btn-outline flex items-center gap-1 text-sm">
          <List className="h-4 w-4" /> 一覧
        </Link>
      </div>

      {/* 地図 */}
      <div className="flex-1 overflow-hidden p-3">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
            現在公開中の出品はありません
          </div>
        ) : (
          <MapListings groups={groups} />
        )}
      </div>

      {/* 凡例 */}
      <div className="shrink-0 border-t border-slate-100 bg-white/90 px-4 py-2 text-center text-xs text-slate-400">
        マーカーをタップすると出品一覧が表示されます。地図は
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> 提供。
      </div>
    </div>
  );
}
