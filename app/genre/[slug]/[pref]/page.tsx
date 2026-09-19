import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ListingGrid } from '@/components/ListingGrid';
import { applyListingFilters } from '@/lib/listingQuery';
import { GENRE_BY_SLUG, AREA_BY_SLUG, CROSS_GENRE_SLUGS, CROSS_AREA_SLUGS } from '@/lib/catalog';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 3600;

type Params = Promise<{ slug: string; pref: string }>;

export async function generateStaticParams() {
  const out: { slug: string; pref: string }[] = [];
  for (const slug of CROSS_GENRE_SLUGS) for (const pref of CROSS_AREA_SLUGS) out.push({ slug, pref });
  return out;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, pref } = await params;
  const g = GENRE_BY_SLUG[slug];
  const a = AREA_BY_SLUG[pref];
  if (!g || !a) return { title: '見つかりません' };
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const desc = `${a.name}の${g.buyback}・ダイレクト販売。${g.desc} 手数料0円・買取保証つき・エスクロー決済のBUYMO ダイレクト。`;
  return {
    title: `${a.name}の${g.buyback}｜${g.label}`,
    description: desc,
    alternates: { canonical: `${BASE}/genre/${slug}/${pref}` },
    openGraph: { title: `${a.name}の${g.buyback} | BUYMO ダイレクト`, description: desc, url: `${BASE}/genre/${slug}/${pref}` },
  };
}

export default async function GenreAreaPage({ params }: { params: Params }) {
  const { slug, pref } = await params;
  const g = GENRE_BY_SLUG[slug];
  const a = AREA_BY_SLUG[pref];
  if (!g || !a) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let listings: ListingWithImages[] = [];
  let count = 0;
  {
    let query = supabase
      .from('listings')
      .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url)', { count: 'exact' })
      .eq('status', 'active')
      .eq('prefecture', a.name);
    if (g.filter) query = applyListingFilters(query, { q: g.filter.q, body: g.filter.body, maker: g.filter.maker, fuel: g.filter.fuel });
    const { data, count: c } = await query.order('created_at', { ascending: false }).limit(12);
    listings = (data ?? []) as unknown as ListingWithImages[];
    count = c ?? 0;
  }

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const otherAreas = CROSS_AREA_SLUGS.filter((s) => s !== pref).map((s) => AREA_BY_SLUG[s]).filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${a.name}の${g.buyback}`,
            description: g.desc,
            url: `${BASE}/genre/${slug}/${pref}`,
          }),
        }}
      />
      <div className="space-y-8">
        <nav className="text-xs text-slate-400">
          <Link href="/genre" className="hover:underline">ジャンル</Link> ›{' '}
          <Link href={`/genre/${slug}`} className="hover:underline">{g.buyback}</Link> › {a.name}
        </nav>

        <section className="rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 px-6 py-12 text-white">
          <span className="mb-2 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取保証つき</span>
          <h1 className="text-3xl font-black sm:text-4xl">{a.name}の{g.buyback}</h1>
          <p className="mt-2 max-w-xl text-green-50">{a.name}での{g.label}の買取・ダイレクト販売。{g.desc}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/listings/valuation" className="btn-gold">{a.name}で無料査定</Link>
            <Link href="/sell" className="btn-accent">この車を出品する</Link>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">{a.name} の {g.label} 出品車<span className="ml-2 text-sm font-bold text-slate-500">（{count}台）</span></h2>
          </div>
          {listings.length > 0 ? (
            <ListingGrid listings={listings} loggedIn={false} />
          ) : (
            <div className="card p-10 text-center text-sm text-slate-500">
              現在 {a.name} の {g.label} の出品はありません。買取査定はいつでも受け付けています。
              <div className="mt-3 flex justify-center gap-2">
                <Link href="/listings/valuation" className="btn-gold text-sm">無料査定を試す</Link>
                <Link href={`/genre/${slug}`} className="btn-outline text-sm">{g.label}のページへ</Link>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-black">他エリアの{g.buyback}</h2>
          <div className="flex flex-wrap gap-2">
            {otherAreas.map((oa) => (
              <Link key={oa.slug} href={`/genre/${slug}/${oa.slug}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-accent-500 hover:text-accent-600">
                {oa.name}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex gap-4">
            <Link href={`/genre/${slug}`} className="text-sm font-bold text-accent-600 hover:underline">{g.buyback}トップ →</Link>
            <Link href={`/area/${pref}`} className="text-sm font-bold text-accent-600 hover:underline">{a.name}の全車種 →</Link>
          </div>
        </section>
      </div>
    </>
  );
}
