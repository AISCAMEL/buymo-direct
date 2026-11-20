import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  FileCheck2,
  MapPin,
  ChevronRight,
  BookOpen,
  Laptop,
  Search,
  Handshake,
  JapaneseYen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/ListingGrid';
import { favoritedSet } from '@/lib/favorites';
import { COLUMNS } from '@/lib/columns';
import { HeroSearchTabs } from '@/components/HeroSearchTabs';
import { CustomerResults } from '@/components/CustomerResults';
import { getCachedFeaturedListings } from '@/lib/cache';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 300; // ISR: home page rebuilds at most once per 5 minutes

// モックのトップ構成を実React/HTMLで再現。実データ（出品・コラム・実績）を接続し、
// 架空の車両情報・レビューは本番表示しない。写真は public/images/buymo/ から読み込む。

const SERVICE_CARDS = [
  { href: '/listings/valuation', img: '/images/buymo/sell-card.webp', title: '車を売りたい', sub: 'プロの買取で高価売却を目指す' },
  { href: '/listings', img: '/images/buymo/buy-card.webp', title: '車を買いたい', sub: '厳選された中古車から理想の一台を' },
  { href: '/dealers?category=整備・修理', img: '/images/buymo/inspection-card.webp', title: '整備・保証', sub: '購入後も安心のサポート体制' },
  { href: '/dealers', img: '/images/buymo/dealer-atmosphere.webp', title: '加盟店を探す', sub: '信頼できる車のプロに相談' },
];

const REASONS = [
  { icon: ShieldCheck, title: '安心のエスクロー決済', desc: 'お金のやり取りも安全。代金は第三者が一時お預かりします。' },
  { icon: FileCheck2, title: '名義変更を代行', desc: '面倒な手続きもおまかせ。行政書士が書類作成〜陸運局手続きを代行。' },
  { icon: MapPin, title: '全国の加盟店ネットワーク', desc: 'お近くの車のプロが対応。全国47都道府県でオンライン完結。' },
];

const SELL_STEPS = [
  { icon: Laptop, step: '1', title: '無料査定申込み', sub: '約3分' },
  { icon: Search, step: '2', title: '査定・ご提案', sub: 'プロが査定' },
  { icon: Handshake, step: '3', title: 'ご成約', sub: '条件に納得後' },
  { icon: JapaneseYen, step: '4', title: 'お支払い', sub: '最短で入金' },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 実データのみ表示（出品が無いときは「入荷待ち」）
  const listings: ListingWithImages[] = await getCachedFeaturedListings();
  const favoritedIds = await favoritedSet(supabase, user?.id, listings.map((l) => l.id));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'BUYMO ダイレクト',
            url: 'https://buymo.me',
            description: 'BUYMOの、買取保証つき 中古車ダイレクト販売。査定・出品・販売・エスクロー決済までオンライン完結、全国対応。',
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: 'https://buymo.me/listings?q={search_term_string}' },
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <div className="-mx-4 -mt-6">

        {/* ── 1. ヒーロー（大型SUV＋見出し＋タブ検索＋安心サポート） ── */}
        <section className="bg-gradient-to-br from-navy-800 to-navy-900">
          <div className="mx-auto grid max-w-7xl items-stretch lg:grid-cols-2">
            <div className="order-2 px-5 py-10 text-center text-white sm:px-8 lg:order-1 lg:py-20 lg:text-left xl:px-12">
              <h1 className="text-[34px] font-black leading-[1.14] text-white sm:text-5xl xl:text-[58px]">
                愛車の価値を、<br className="hidden sm:block" /><span className="text-accent-200">もっと自由に。</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-base lg:mx-0">
                売るのも、買うのも、プロのサポートで。<br className="hidden sm:block" />
                安心・スマートなカーライフを。
              </p>

              {/* 安心3点 */}
              <ul className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-white/90 lg:mx-0 lg:justify-start">
                <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent-200" />安心の取引<span className="font-normal text-white/60">（エスクロー決済）</span></li>
                <li className="inline-flex items-center gap-1.5"><FileCheck2 className="h-4 w-4 text-accent-200" />名義変更代行</li>
                <li className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent-200" />全国対応</li>
              </ul>

              {/* タブ切替の検索ボックス（購入／買取査定） */}
              <HeroSearchTabs />
            </div>

            {/* 大型SUVのヒーロー写真 */}
            <div className="relative order-1 min-h-[280px] overflow-hidden sm:min-h-[400px] lg:order-2 lg:min-h-full">
              <Image
                src="/images/buymo/hero-premium.webp"
                alt="ディーラー前に佇むプレミアムSUV（BUYMO ダイレクトのイメージ）"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="kenburns object-cover object-center lg:object-[60%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/50 to-transparent lg:bg-gradient-to-r lg:from-navy-900/80 lg:via-navy-900/10 lg:to-transparent" />
              <div className="absolute bottom-4 right-4 hidden flex-col items-center rounded-2xl border border-gold-500/60 bg-navy-900/70 px-4 py-2.5 text-center backdrop-blur sm:flex">
                <span className="text-[10px] font-bold text-gold-500">中古車取引の</span>
                <span className="text-sm font-black leading-tight text-white">安心サポート</span>
                <span className="mt-0.5 text-[9px] font-bold tracking-widest text-white/70">BUYMO DIRECT</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. サービス4導線（売る／買う／整備・保証／加盟店） ── */}
        <section className="bg-white px-4 pb-6 pt-10 sm:pt-14">
          <div className="mx-auto max-w-6xl">
            <div data-reveal className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {SERVICE_CARDS.map(({ href, img, title, sub }) => (
                <Link
                  key={title}
                  href={href}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:aspect-[5/4]"
                >
                  <Image src={img} alt={title} fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-black leading-tight text-white sm:text-lg">{title}</h3>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/80 sm:text-xs">{sub}</p>
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-navy-800 transition group-hover:bg-accent-500 group-hover:text-white sm:h-8 sm:w-8">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. 選ばれる3つの理由（写真＋3ポイント） ── */}
        <section className="bg-gradient-to-br from-accent-50 to-white px-4 py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div data-reveal>
              <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Why BUYMO</p>
              <h2 className="mt-1 text-2xl font-black text-navy-800 sm:text-3xl">選ばれる3つの理由</h2>
              <p className="mt-1 text-sm text-slate-500">BUYMO ダイレクトが、安心してご利用いただける理由</p>
              <div className="mt-6 flex flex-col gap-4">
                {REASONS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-accent-100">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-navy-800">{title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div data-reveal className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-md ring-1 ring-black/5">
              <Image src="/images/buymo/sell-appraisal.webp" alt="BUYMOのプロによる安心の査定・サポート" fill sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* ── 4. 人気の中古車（実データ・写真主体4カラム） ── */}
        <section className="bg-white px-4 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Pickup</p>
                <h2 className="mt-1 text-2xl font-black text-navy-800 sm:text-3xl">人気の中古車</h2>
              </div>
              <Link href="/listings" className="flex shrink-0 items-center gap-0.5 text-sm font-bold text-accent-600 hover:underline">
                すべての中古車を見る <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {listings.length > 0 ? (
              <ListingGrid listings={listings} favoritedIds={favoritedIds} loggedIn={!!user} />
            ) : (
              <div className="card flex flex-col items-center gap-3 p-12 text-center">
                <div className="text-5xl" aria-hidden="true">🚗</div>
                <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-black tracking-wide text-navy-600">入荷待ち</span>
                <h3 className="text-lg font-black text-navy-700">ただいま入荷準備中です</h3>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                  近日、BUYMO ダイレクトに車両を掲載予定です。<br />
                  「買取保証つき」で、あなたのクルマの出品もお待ちしています。
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Link href="/sell" className="btn-primary px-5 py-2.5 text-sm">クルマを出品する</Link>
                  <Link href="/listings/valuation" className="btn-outline px-5 py-2.5 text-sm">無料査定を試す</Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 5. 車を売るのも、カンタン・安心（大型CTA・4ステップ） ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-navy-700 to-navy-900 px-4 py-16 text-white">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
              <div data-reveal className="lg:w-[38%]">
                <span className="inline-block rounded-full bg-accent-500 px-3 py-1 text-xs font-black text-white">最短3分で完了</span>
                <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">車を売るのも、<br className="hidden sm:block" />カンタン・安心。</h2>
                <p className="mt-2 text-sm text-white/70">査定から入金まで、すべてオンラインでスムーズに。</p>
                <Link href="/listings/valuation" className="btn-accent mt-6 inline-flex px-6 py-3 text-base">
                  愛車を無料で査定する <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div data-reveal className="lg:w-[62%]">
                <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SELL_STEPS.map(({ icon: Icon, step, title, sub }) => (
                    <li key={step} className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
                      <span className="text-xs font-black text-accent-200">STEP {step}</span>
                      <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/20">
                        <Icon className="h-5 w-5 text-accent-200" />
                      </div>
                      <h3 className="mt-3 text-sm font-black leading-tight text-white">{title}</h3>
                      <p className="mt-0.5 text-[11px] text-white/60">{sub}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. ご利用者の声（実データ・3枚以上で表示） ── */}
        <CustomerResults />

        {/* ── 7. 最新のコラム ── */}
        <section className="bg-[#F5F9F8] px-4 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="flex items-center gap-1.5 text-2xl font-black text-navy-800 sm:text-3xl"><BookOpen className="h-6 w-6 text-accent-600" />最新のコラム</h2>
              <Link href="/column" className="shrink-0 text-sm font-bold text-accent-600 hover:underline">すべての記事を見る →</Link>
            </div>
            <div data-reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.slice(0, 4).map((c) => (
                <Link key={c.slug} href={`/column/${c.slug}`} className="card group flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-600">{c.cat}</span>
                  <h3 className="line-clamp-3 text-sm font-bold text-navy-800 group-hover:text-accent-600">{c.title}</h3>
                  <span className="mt-3 text-xs font-bold text-accent-600">続きを読む →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
