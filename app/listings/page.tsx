import { Suspense } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SearchFilters } from '@/components/SearchFilters';
import { ListingGrid } from '@/components/ListingGrid';
import { SortSelect } from '@/components/SortSelect';
import { SaveSearchButton } from '@/components/SaveSearchButton';
import { PaginationBar } from '@/components/PaginationBar';
import { MobileFilterButton } from '@/components/MobileFilterDrawer';
import { ActiveFilters } from '@/components/ActiveFilters';
import { applyListingFilters } from '@/lib/listingQuery';
import { favoritedSet } from '@/lib/favorites';
import type { ListingWithImages } from '@/lib/types';

const PAGE_SIZE = 24;

export const revalidate = 60; // ISR: rebuild listing index at most once per minute

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS: Record<string, { column: string; ascending: boolean }> = {
  new: { column: 'created_at', ascending: false },
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  mileage_asc: { column: 'mileage_km', ascending: true },
  year_desc: { column: 'year', ascending: false },
};

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sort = get('sort') ?? 'new';
  const order = SORTS[sort] ?? SORTS.new;
  const page = Math.max(1, Number(get('page') ?? 1));

  const filterParams = {
    q: get('q'),
    maker: get('maker'),
    model: get('model'),
    body: get('body'),
    pref: get('pref'),
    prefs: get('prefs'),
    norepair: get('norepair'),
    // 旧インデックス方式（後方互換）
    price: get('price'),
    year: get('year'),
    mileage: get('mileage'),
    // 新直接値方式
    price_min: get('price_min'),
    price_max: get('price_max'),
    year_min: get('year_min'),
    year_max: get('year_max'),
    km_max: get('km_max'),
    fuel: get('fuel'),
    transmission: get('transmission'),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('listings')
    .select('*, listing_images(*), profiles(id, display_name, prefecture, avatar_url)', { count: 'exact' })
    .eq('status', 'active');

  query = applyListingFilters(query, filterParams);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query
    .order('boosted_until', { ascending: false, nullsFirst: false })
    .order(order.column, { ascending: order.ascending })
    .range(from, from + PAGE_SIZE - 1);

  const listings = (data ?? []) as unknown as ListingWithImages[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const favoritedIds = await favoritedSet(supabase, user?.id, listings.map((l) => l.id));

  const paginationParams: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(filterParams).concat([['sort', sort === 'new' ? undefined : sort]])
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* デスクトップサイドバー（モバイルは非表示） */}
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <SearchFilters />
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">
            車を探す{' '}
            <span className="text-sm font-bold text-slate-500">
              {count ?? 0}件
              {(count ?? 0) > PAGE_SIZE && `（${page}/${totalPages}ページ）`}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            {/* モバイル専用フィルタボタン */}
            <Suspense>
              <MobileFilterButton />
            </Suspense>
            <Link href="/listings/map" className="btn-outline flex items-center gap-1 text-sm">
              <MapPin className="h-4 w-4" /> 地図
            </Link>
            <SaveSearchButton loggedIn={!!user} />
            <SortSelect />
          </div>
        </div>
        {/* アクティブフィルターチップ */}
        <Suspense>
          <ActiveFilters />
        </Suspense>
        {listings.length > 0 ? (
          <>
            <ListingGrid listings={listings} favoritedIds={favoritedIds} loggedIn={!!user} />
            <PaginationBar page={page} totalPages={totalPages} searchParams={paginationParams} />
          </>
        ) : (
          <div className="card p-10 text-center text-sm text-slate-500">
            条件に合う車両が見つかりませんでした。条件を変えてお試しください。
          </div>
        )}
      </section>
    </div>
  );
}
