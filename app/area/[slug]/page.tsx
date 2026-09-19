import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ChevronRight, MapPin } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ListingGrid } from '@/components/ListingGrid';
import { AREAS, AREA_BY_SLUG } from '@/lib/catalog';
import { BODY_TYPES } from '@/lib/constants';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const area = AREA_BY_SLUG[slug];
  if (!area) return { title: '見つかりません' };
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const desc = `${area.name}の中古車をダイレクト販売・買取保証つきで。BUYMO ダイレクトで${area.name}の出品車両を探す・売る。手数料0円・エスクロー決済で安心。`;
  return {
    title: `${area.name}の中古車｜ダイレクト販売・買取`,
    description: desc,
    alternates: { canonical: `${BASE}/area/${slug}` },
    openGraph: { title: `${area.name}の中古車 | BUYMO ダイレクト`, description: desc, url: `${BASE}/area/${slug}` },
  };
}

export default async function AreaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const area = AREA_BY_SLUG[slug];
  if (!area) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, count } = await supabase
    .from('listings')
    .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url)', { count: 'exact' })
    .eq('status', 'active')
    .eq('prefecture', area.name)
    .order('created_at', { ascending: false })
    .limit(12);

  const listings = (data ?? []) as unknown as ListingWithImages[];
  const siblings = AREAS.filter((a) => a.region === area.region && a.slug !== area.slug);
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${area.name}の中古車`,
            url: `${BASE}/area/${slug}`,
          }),
        }}
      />
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-2xl">
          <Image src={`/area/${slug}.jpg`} alt={`${area.name}の中古車・買取`} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 to-navy-700/55" />
          <div className="relative px-6 py-12 text-white">
            <p className="mb-2 flex items-center gap-1 text-sm font-bold text-accent-200"><MapPin className="h-4 w-4" />{area.region}エリア</p>
            <span className="mb-2 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取保証つき</span>
            <h1 className="text-3xl font-black sm:text-4xl">{area.name} の中古車</h1>
            <p className="mt-2 text-white/85">{count ?? 0} 台出品中 · 買取保証つき · 手数料0円 · エスクロー決済</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/listings?prefs=${encodeURIComponent(area.name)}`} className="inline-flex items-center gap-1 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold hover:bg-white/30 transition">
                {area.name} の車を探す <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/listings/valuation" className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-[#2E2408] hover:bg-gold-600 transition">
                {area.name} で無料査定（買取）
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-black">{area.name} × ボディタイプで絞り込む</h2>
          <div className="flex flex-wrap gap-2">
            {BODY_TYPES.filter((b) => b !== 'その他').map((b) => (
              <Link key={b} href={`/listings?prefs=${encodeURIComponent(area.name)}&body=${encodeURIComponent(b)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-navy-400 hover:text-navy-500">
                {b}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">新着 {area.name} の出品<span className="ml-2 text-sm font-bold text-slate-500">（{count ?? 0}台）</span></h2>
            {(count ?? 0) > 12 && (
              <Link href={`/listings?prefs=${encodeURIComponent(area.name)}`} className="flex items-center gap-0.5 text-sm font-bold text-accent-600 hover:underline">すべて見る <ChevronRight className="h-4 w-4" /></Link>
            )}
          </div>
          {listings.length > 0 ? (
            <ListingGrid listings={listings} loggedIn={false} />
          ) : (
            <div className="card p-10 text-center text-sm text-slate-500">
              現在 {area.name} の出品はありません。
              <div className="mt-3 flex justify-center gap-2">
                <Link href="/sell" className="btn-accent text-sm">クルマを出品する</Link>
                <Link href="/listings/valuation" className="btn-outline text-sm">無料査定を試す</Link>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-black">{area.region} の他のエリア</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((a) => (
              <Link key={a.slug} href={`/area/${a.slug}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-accent-500 hover:text-accent-600">
                {a.name}
              </Link>
            ))}
          </div>
          <div className="mt-4"><Link href="/area" className="text-sm font-bold text-accent-600 hover:underline">全国のエリアから探す →</Link></div>
        </section>
      </div>
    </>
  );
}
