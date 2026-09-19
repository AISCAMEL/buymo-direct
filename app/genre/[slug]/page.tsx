import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ChevronRight, ShieldCheck, Banknote } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ListingGrid } from '@/components/ListingGrid';
import { applyListingFilters } from '@/lib/listingQuery';
import { GENRES, GENRE_BY_SLUG, CROSS_GENRE_SLUGS, CROSS_AREA_SLUGS, AREA_BY_SLUG } from '@/lib/catalog';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return GENRES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const g = GENRE_BY_SLUG[slug];
  if (!g) return { title: '見つかりません' };
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const title = `${g.buyback}・ダイレクト販売｜${g.label}`;
  return {
    title,
    description: `${g.desc} 手数料0円・買取保証つき・エスクロー決済で安心のBUYMO ダイレクト。`,
    alternates: { canonical: `${BASE}/genre/${slug}` },
    openGraph: { title: `${title} | BUYMO ダイレクト`, description: g.desc, url: `${BASE}/genre/${slug}` },
  };
}

export default async function GenrePage({ params }: { params: Params }) {
  const { slug } = await params;
  const g = GENRE_BY_SLUG[slug];
  if (!g) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let listings: ListingWithImages[] = [];
  let count = 0;
  if (g.filter) {
    let query = supabase
      .from('listings')
      .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url)', { count: 'exact' })
      .eq('status', 'active');
    query = applyListingFilters(query, {
      q: g.filter.q,
      body: g.filter.body,
      maker: g.filter.maker,
      fuel: g.filter.fuel,
    });
    const { data, count: c } = await query.order('created_at', { ascending: false }).limit(12);
    listings = (data ?? []) as unknown as ListingWithImages[];
    count = c ?? 0;
  }

  // ダイレクト一覧への絞り込みリンク
  const listParams = new URLSearchParams();
  if (g.filter?.q) listParams.set('q', g.filter.q);
  if (g.filter?.body) listParams.set('body', g.filter.body);
  if (g.filter?.maker) listParams.set('maker', g.filter.maker);
  if (g.filter?.fuel) listParams.set('fuel', g.filter.fuel);
  const listHref = `/listings${listParams.toString() ? `?${listParams.toString()}` : ''}`;

  const related = GENRES.filter((x) => x.cat === g.cat && x.slug !== g.slug).slice(0, 6);
  const isCross = CROSS_GENRE_SLUGS.includes(g.slug);
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${g.buyback}・ダイレクト販売`,
            description: g.desc,
            url: `${BASE}/genre/${slug}`,
          }),
        }}
      />
      <div className="space-y-8">
        {/* ヒーロー */}
        <section className="relative overflow-hidden rounded-2xl">
          <Image src={`/genre/${g.slug}.jpg`} alt={g.label} fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 to-navy-700/60" />
          <div className="relative px-6 py-12 text-white">
            <span className="mb-2 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取保証つき</span>
            <h1 className="text-3xl font-black sm:text-4xl">{g.label}の買取・ダイレクト販売</h1>
            <p className="mt-2 max-w-xl text-white/85">{g.desc}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/listings/valuation" className="btn-gold">無料査定を申し込む（買取）</Link>
              {g.filter && <Link href={listHref} className="btn-accent">出品車を探す（ダイレクト）</Link>}
              <Link href="/sell" className="inline-flex items-center gap-1 rounded-full border-2 border-white/70 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">この車を出品する</Link>
            </div>
          </div>
        </section>

        {/* 安心ポイント */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: '買取保証つき', d: '売れなくてもBUYMOが買取' },
            { icon: Banknote, t: '手数料0円・査定無料', d: '写真査定でネット完結' },
            { icon: ShieldCheck, t: 'エスクロー決済', d: '代金を第三者が一時保全' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50"><Icon className="h-5 w-5 text-accent-600" /></span>
              <div><p className="text-sm font-bold text-navy-800">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
            </div>
          ))}
        </section>

        {/* 出品一覧（ダイレクト在庫があるジャンルのみ） */}
        {g.filter && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">{g.label} の出品車<span className="ml-2 text-sm font-bold text-slate-500">（{count}台）</span></h2>
              {count > 12 && <Link href={listHref} className="flex items-center gap-0.5 text-sm font-bold text-accent-600 hover:underline">すべて見る <ChevronRight className="h-4 w-4" /></Link>}
            </div>
            {listings.length > 0 ? (
              <ListingGrid listings={listings} loggedIn={false} />
            ) : (
              <div className="card p-10 text-center text-sm text-slate-500">
                現在 {g.label} の出品はありません。買取査定はいつでも受け付けています。
                <div className="mt-3 flex justify-center gap-2">
                  <Link href="/listings/valuation" className="btn-gold text-sm">無料査定を試す</Link>
                  <Link href="/sell" className="btn-outline text-sm">{g.label}を出品する</Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 買取専門ジャンル（廃車・パーツ等）: 査定訴求 */}
        {!g.filter && (
          <section className="card bg-navy-50 p-6 text-center">
            <h2 className="text-lg font-black text-navy-800">{g.buyback}はBUYMOにおまかせ</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">{g.desc}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/listings/valuation" className="btn-gold">無料査定を申し込む</Link>
              <Link href="/contact" className="btn-outline">相談する</Link>
            </div>
          </section>
        )}

        {/* ジャンル×エリア（該当ジャンルのみ） */}
        {isCross && (
          <section>
            <h2 className="mb-3 text-lg font-black">エリア別の{g.buyback}</h2>
            <div className="flex flex-wrap gap-2">
              {CROSS_AREA_SLUGS.map((as) => {
                const a = AREA_BY_SLUG[as];
                return (
                  <Link key={as} href={`/genre/${g.slug}/${as}`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-accent-500 hover:text-accent-600">
                    {a?.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 関連ジャンル */}
        {related.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-black">関連ジャンル</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/genre/${r.slug}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-accent-500 hover:text-accent-600">
                  {r.label}
                </Link>
              ))}
            </div>
            <div className="mt-4"><Link href="/genre" className="text-sm font-bold text-accent-600 hover:underline">すべてのジャンルを見る →</Link></div>
          </section>
        )}
      </div>
    </>
  );
}
