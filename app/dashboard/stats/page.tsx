import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Eye, Heart, TrendingUp, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/stats');

  // Fetch all seller listings with view count
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, maker, model, price, status, view_count, created_at, listing_images(url, sort_order)')
    .eq('seller_id', user.id)
    .order('view_count', { ascending: false });

  const rows = (listings ?? []) as {
    id: string;
    title: string;
    maker: string;
    model: string;
    price: number;
    status: string;
    view_count: number;
    created_at: string;
    listing_images: { url: string; sort_order: number }[];
  }[];

  // Fetch favorite counts for all listings in one query
  const listingIds = rows.map((l) => l.id);
  const { data: favData } = await supabase
    .from('favorites')
    .select('listing_id')
    .in('listing_id', listingIds.length > 0 ? listingIds : ['__none__']);

  const favCount: Record<string, number> = {};
  for (const f of favData ?? []) {
    favCount[f.listing_id] = (favCount[f.listing_id] ?? 0) + 1;
  }

  // Summary stats
  const totalViews = rows.reduce((s, l) => s + (l.view_count ?? 0), 0);
  const totalFavs = Object.values(favCount).reduce((s, c) => s + c, 0);
  const activeCount = rows.filter((l) => l.status === 'active').length;
  const soldCount = rows.filter((l) => l.status === 'sold').length;

  const maxViews = Math.max(...rows.map((l) => l.view_count ?? 0), 1);
  const maxFavs = Math.max(...Object.values(favCount), 1);

  const STATUS_LABEL: Record<string, string> = {
    active: '公開中',
    reserved: '商談中',
    sold: '売約済み',
    draft: '下書き',
    closed: '取り下げ',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">アナリティクス</h1>
        <Link href="/dashboard/listings" className="btn-outline text-sm">
          ← 出品管理に戻る
        </Link>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-500">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">総閲覧数</p>
            <p className="text-2xl font-black text-navy-600">{totalViews.toLocaleString()}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">総お気に入り</p>
            <p className="text-2xl font-black text-red-500">{totalFavs.toLocaleString()}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">公開中</p>
            <p className="text-2xl font-black text-accent-600">{activeCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">売約済み</p>
            <p className="text-2xl font-black">{soldCount}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          出品がないため、データがありません。
          <div className="mt-3">
            <Link href="/sell" className="btn-accent text-sm">
              最初の1台を出品する
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 閲覧数グラフ */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4 text-navy-500" />
              <h2 className="font-black">出品別 閲覧数</h2>
            </div>
            <div className="space-y-3">
              {rows.map((l) => {
                const cover = [...(l.listing_images ?? [])]
                  .sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
                const pct = Math.round(((l.view_count ?? 0) / maxViews) * 100);
                return (
                  <div key={l.id} className="group">
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <Link
                        href={`/listings/${l.id}`}
                        className="flex min-w-0 items-center gap-2 hover:underline"
                      >
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100">
                          {cover && (
                            <Image src={cover} alt="" fill className="object-cover" sizes="32px" />
                          )}
                        </div>
                        <span className="truncate font-bold">{l.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </Link>
                      <span className="shrink-0 font-black text-navy-600">
                        {(l.view_count ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-navy-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* お気に入り数グラフ */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <h2 className="font-black">出品別 お気に入り数</h2>
            </div>
            <div className="space-y-3">
              {[...rows]
                .sort((a, b) => (favCount[b.id] ?? 0) - (favCount[a.id] ?? 0))
                .map((l) => {
                  const fav = favCount[l.id] ?? 0;
                  const pct = Math.round((fav / maxFavs) * 100);
                  const cover = [...(l.listing_images ?? [])]
                    .sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
                  return (
                    <div key={l.id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <Link
                          href={`/listings/${l.id}`}
                          className="flex min-w-0 items-center gap-2 hover:underline"
                        >
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100">
                            {cover && (
                              <Image src={cover} alt="" fill className="object-cover" sizes="32px" />
                            )}
                          </div>
                          <span className="truncate font-bold">{l.title}</span>
                        </Link>
                        <span className="shrink-0 font-black text-red-500">{fav.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-red-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* 出品一覧テーブル */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-black">出品サマリー</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-bold">タイトル</th>
                    <th className="px-4 py-3 font-bold">価格</th>
                    <th className="px-4 py-3 font-bold text-center">
                      <Eye className="mx-auto h-3.5 w-3.5" />
                    </th>
                    <th className="px-4 py-3 font-bold text-center">
                      <Heart className="mx-auto h-3.5 w-3.5" />
                    </th>
                    <th className="px-4 py-3 font-bold">ステータス</th>
                    <th className="px-4 py-3 font-bold">出品日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/listings/${l.id}`} className="font-bold hover:underline">
                          <span className="block max-w-[200px] truncate">{l.title}</span>
                          <span className="text-xs font-normal text-slate-400">
                            {l.maker} {l.model}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-bold text-navy-600">{formatYen(l.price)}</td>
                      <td className="px-4 py-3 text-center font-bold">
                        {(l.view_count ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-red-500">
                        {(favCount[l.id] ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            l.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : l.status === 'reserved'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
