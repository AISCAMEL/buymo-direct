import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ChevronRight, ShieldCheck, Banknote, CheckCircle2, HelpCircle, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ListingGrid } from '@/components/ListingGrid';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SITE_BASE, itemListJsonLd, faqPageJsonLd } from '@/lib/seo';
import { getGenreContent } from '@/lib/genre-content';
import { applyListingFilters } from '@/lib/listingQuery';
import { GENRES, GENRE_BY_SLUG, CROSS_GENRE_SLUGS, CROSS_AREA_SLUGS, AREA_BY_SLUG } from '@/lib/catalog';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 3600;

// 廃車・事故車・不動車・過走行車は「その場提示」買取フロー（/haisha）へ誘導する
const HAISHA_SLUGS = ['haisha', 'jiko', 'fudou', 'kasoukou'];

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return GENRES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const g = GENRE_BY_SLUG[slug];
  if (!g) return { title: '見つかりません' };
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const isParts = g.cat === 'parts';
  const title = isParts ? `${g.label}のオークション出品・入札｜BUYMO` : g.buybackOnly ? `${g.buyback}｜${g.label}` : `${g.buyback}・ダイレクト販売｜${g.label}`;
  return {
    title,
    description: isParts
      ? `${g.desc} ヤフオク形式で${g.label}を出品・入札。即決にも対応（買取保証対象外）。`
      : `${g.desc} 手数料0円・買取保証つき・エスクロー決済で安心のBUYMO ダイレクト。`,
    alternates: { canonical: `${BASE}/genre/${slug}` },
    openGraph: { title: `${title} | BUYMO ダイレクト`, description: g.desc, url: `${BASE}/genre/${slug}` },
  };
}

export default async function GenrePage({ params }: { params: Params }) {
  const { slug } = await params;
  const g = GENRE_BY_SLUG[slug];
  if (!g) notFound();

  const content = getGenreContent(g);
  const isParts = g.cat === 'parts'; // パーツ系はヤフオク形式・買取保証なし

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
      {listings.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(`${g.label}の中古車`, listings.map((l) => `${SITE_BASE}/listings/${l.id}`)),
            ),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(content.faqs)) }}
      />
      <div className="space-y-8">
        <Breadcrumbs
          items={[
            { name: 'ホーム', url: `${BASE}/` },
            { name: '車を探す', url: `${BASE}/listings` },
            { name: g.label, url: `${BASE}/genre/${slug}` },
          ]}
        />
        {/* ヒーロー */}
        <section className="relative overflow-hidden rounded-2xl">
          <Image src={`/genre/${g.slug}.jpg`} alt={g.label} fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 to-navy-700/60" />
          <div className="relative px-6 py-12 text-white">
            <span className="mb-2 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">{isParts ? 'オークション形式' : '買取保証つき'}</span>
            <h1 className="text-3xl font-black sm:text-4xl">{isParts ? `${g.label}のオークション` : g.buybackOnly ? `${g.label}の買取` : `${g.label}の買取・ダイレクト販売`}</h1>
            <p className="mt-2 max-w-xl text-white/85">{g.desc}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {isParts ? (
                <>
                  <Link href="/parts/new" className="btn-gold">このパーツを出品する</Link>
                  <Link href={`/parts?cat=${g.slug === 'parts' ? 'other' : g.slug}`} className="btn-accent">パーツを探す（入札）</Link>
                </>
              ) : HAISHA_SLUGS.includes(g.slug) ? (
                <Link href="/haisha" className="btn-gold">その場提示で買取額を見る</Link>
              ) : (
                <Link href="/listings/valuation" className="btn-gold">無料査定を申し込む（買取）</Link>
              )}
              {!isParts && g.filter && <Link href={listHref} className="btn-accent">出品車を探す（ダイレクト）</Link>}
              {!isParts && !g.buybackOnly && <Link href="/sell" className="inline-flex items-center gap-1 rounded-full border-2 border-white/70 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">この車を出品する</Link>}
            </div>
          </div>
        </section>

        {/* その場提示買取（廃車・事故車・不動車・過走行車に共通で埋め込み） */}
        {HAISHA_SLUGS.includes(g.slug) && (
          <section className="relative overflow-hidden rounded-2xl border border-navy-700 bg-gradient-to-br from-navy-800 to-navy-600 p-6 text-white sm:p-7">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">
              <Banknote className="h-3.5 w-3.5" /> その場提示買取
            </span>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">金額をその場で提示。還付金も別枠で計算。</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              全国買取価格表（都道府県 × 排気量）をもとに、{g.label}の買取額をその場で概算。
              無料出張引取り・廃車（抹消）手続き・還付金のご案内までワンストップです。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              {['無料出張引取り', '抹消手続き無料', 'リサイクル料金込み買取', '還付金は別枠でお戻し'].map((t) => (
                <span key={t} className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/20">{t}</span>
              ))}
            </div>
            <Link href="/haisha" className="btn-gold mt-5 inline-flex">
              その場で買取額を見る <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        {/* 安心ポイント（パーツはオークション向けに差し替え） */}
        <section className="grid gap-3 sm:grid-cols-3">
          {(isParts
            ? [
                { icon: Banknote, t: 'オークション形式', d: '入札で高く売れるチャンス' },
                { icon: TrendingUp, t: '即決にも対応', d: 'すぐ売りたい時は即決価格を設定' },
                { icon: ShieldCheck, t: '写真で手軽に出品', d: '型番・サイズを載せるだけ' },
              ]
            : [
                { icon: ShieldCheck, t: '買取保証つき', d: '売れなくてもBUYMOが買取' },
                { icon: Banknote, t: '手数料0円・査定無料', d: '写真査定でネット完結' },
                { icon: ShieldCheck, t: 'エスクロー決済', d: '代金を第三者が一時保全' },
              ]
          ).map(({ icon: Icon, t, d }) => (
            <div key={t} className="card flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50"><Icon className="h-5 w-5 text-accent-600" /></span>
              <div><p className="text-sm font-bold text-navy-800">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
            </div>
          ))}
        </section>

        {/* 解説（本文） */}
        <section className="card p-6">
          <h2 className="text-lg font-black text-navy-800">{isParts ? `${g.label}の出品について` : `${g.label}の買取・売却について`}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
            {content.intro.map((p, i) => <p key={i}>{p}</p>)}
          </div>
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

        {/* 買取専門ジャンル／パーツの訴求 */}
        {!g.filter && (
          <section className="card bg-navy-50 p-6 text-center">
            <h2 className="text-lg font-black text-navy-800">
              {isParts ? `${g.label}はオークションに出品` : `${g.buyback}はBUYMOにおまかせ`}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">{g.desc}</p>
            <div className="mt-4 flex justify-center gap-2">
              {isParts ? (
                <>
                  <Link href="/parts/new" className="btn-gold">オークションに出品する</Link>
                  <Link href={`/parts?cat=${g.slug === 'parts' ? 'other' : g.slug}`} className="btn-outline">入札で探す</Link>
                </>
              ) : HAISHA_SLUGS.includes(g.slug) ? (
                <>
                  <Link href="/haisha" className="btn-gold">その場提示で買取額を見る</Link>
                  <Link href="/contact" className="btn-outline">相談する</Link>
                </>
              ) : (
                <>
                  <Link href="/listings/valuation" className="btn-gold">無料査定を申し込む</Link>
                  <Link href="/contact" className="btn-outline">相談する</Link>
                </>
              )}
            </div>
          </section>
        )}

        {/* 高く売るコツ・特徴 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-navy-800">
            <TrendingUp className="h-5 w-5 text-accent-600" />{g.label}を高く売るポイント
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.points.map((p) => (
              <div key={p.t} className="card flex items-start gap-3 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />
                <div><p className="text-sm font-bold text-navy-800">{p.t}</p><p className="text-xs text-slate-500">{p.d}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* 売却ステップ */}
        <section>
          <h2 className="mb-3 text-lg font-black text-navy-800">{g.label}の{isParts ? '出品' : g.buybackOnly ? '買取' : '売却'}の流れ</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {content.steps.map((s, i) => (
              <div key={s.t} className="card p-4">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-700 text-xs font-black text-white">{i + 1}</span>
                <p className="mt-2 text-sm font-bold text-navy-800">{s.t}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* よくある質問 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-navy-800">
            <HelpCircle className="h-5 w-5 text-accent-600" />よくある質問
          </h2>
          <div className="space-y-2">
            {content.faqs.map((f) => (
              <details key={f.q} className="card p-4">
                <summary className="cursor-pointer list-none text-sm font-bold text-navy-800">Q. {f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">A. {f.a}</p>
              </details>
            ))}
          </div>
        </section>

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
