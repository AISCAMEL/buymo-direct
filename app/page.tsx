import Link from 'next/link';
import Image from 'next/image';
import type { ComponentType } from 'react';
import { SaleResultsSlider } from '@/components/SaleResultsSlider';
import {
  ShieldCheck,
  MessageSquare,
  FileCheck2,
  ChevronRight,
  Banknote,
  Zap,
  LayoutDashboard,
  Tag,
  BookOpen,
  Car,
  Recycle,
  Wrench,
  CreditCard,
  Mail,
  LifeBuoy,
  MapPin,
  Truck,
  Bus,
  Caravan,
  Mountain,
  Sparkles,
  Leaf,
  Compass,
  Globe,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { ListingGrid } from '@/components/ListingGrid';
import { favoritedSet } from '@/lib/favorites';
import { BODY_TYPES } from '@/lib/constants';
import { GENRES, AREAS } from '@/lib/catalog';
import { COLUMNS } from '@/lib/columns';
import { HowItWorksTabs } from '@/components/HowItWorksTabs';
import { HeroSearchTabs } from '@/components/HeroSearchTabs';
import { CustomerResults } from '@/components/CustomerResults';
import { getGenreIconMap } from '@/lib/genre-icons';
import { getCachedFeaturedListings } from '@/lib/cache';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 300; // ISR: home page rebuilds at most once per 5 minutes

const POPULAR_MAKERS = ['トヨタ', 'ホンダ', '日産', 'マツダ', 'スバル', 'スズキ', 'ダイハツ', '三菱'];

const BODY_IMG: Record<string, string> = {
  '軽自動車': '/cars/kei.jpg',
  'コンパクト': '/cars/compact.jpg',
  'セダン': '/cars/sedan.jpg',
  'SUV': '/cars/suv.jpg',
  'ミニバン': '/cars/minivan.jpg',
  'ワゴン': '/cars/subaru.jpg',
};

// 車種アイコン（透過イラスト）— 車種から探すタイル用
const BODY_ICON: Record<string, string> = {
  '軽自動車': '/body/kei.png',
  'コンパクト': '/body/compact.png',
  'セダン': '/body/sedan.png',
  'SUV': '/body/suv.png',
  'ミニバン': '/body/minivan.png',
  'ワゴン': '/body/wagon.png',
  'クーペ': '/body/coupe.png',
  'オープン': '/body/open.png',
};

// ジャンルのアイコン（lucide）— ジャンルタイルを統一感のあるアイコン表示に
const GENRE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  kei: Car,
  suv: Mountain,
  minivan: Bus,
  alphard: Sparkles,
  hiace: Caravan,
  prius: Leaf,
  jimny: Compass,
  jiko: Wrench,
  haisha: Recycle,
  ev: Zap,
  import: Globe,
  truck: Truck,
};

// 自作SVGアイコン（public/genre-icons/<slug>.svg）。あれば画像、無ければlucideにフォールバック。
const GENRE_IMG: Record<string, string> = {
  kei: '/genre-icons/kei.svg',
  suv: '/genre-icons/suv.svg',
  minivan: '/genre-icons/minivan.svg',
  alphard: '/genre-icons/alphard.svg',
  hiace: '/genre-icons/hiace.svg',
  prius: '/genre-icons/prius.svg',
  jimny: '/genre-icons/jimny.svg',
  jiko: '/genre-icons/jiko.svg',
  haisha: '/genre-icons/haisha.svg',
  ev: '/genre-icons/ev.svg',
  import: '/genre-icons/import.svg',
  truck: '/genre-icons/truck.svg',
};

const SAFETY_POINTS = [
  {
    icon: ShieldCheck,
    title: '買取保証つき',
    desc: '万一売れなくても、BUYMOが買い取り。売り手も安心して出品できます。',
    box: 'bg-accent-50 group-hover:bg-accent-600',
    ic: 'text-accent-600',
  },
  {
    icon: Banknote,
    title: 'エスクロー決済',
    desc: '代金は第三者が一時お預かり。車と代金の受け渡しを安全に行えます。',
    box: 'bg-sky-50 group-hover:bg-sky-600',
    ic: 'text-sky-600',
  },
  {
    icon: FileCheck2,
    title: '本人確認・名義変更',
    desc: '出品者・購入者の本人確認を実施。面倒な名義変更手続きも代行します。',
    box: 'bg-violet-50 group-hover:bg-violet-600',
    ic: 'text-violet-600',
  },
  {
    icon: MessageSquare,
    title: 'チャット＆取引監視',
    desc: 'サイト内チャットで直接やりとり。不審な取引は運営が監視・対応します。',
    box: 'bg-coral-50 group-hover:bg-coral-600',
    ic: 'text-coral-600',
  },
];

const DEALER_BULLETS = [
  { icon: Zap, text: '在庫DMS連携API — 在庫データを自動同期' },
  { icon: LayoutDashboard, text: '専用管理ダッシュボード — 成約・在庫を一元管理' },
  { icon: Tag, text: '成約手数料優遇 — 個人より低い手数料率' },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ログイン済みの一般会員には、業販・加盟・募集系のカテゴリを出さない。
  const access = await getViewerAccess();
  const hideBiz = access.loggedIn && !access.businessTrack;

  // ジャンルアイコン（AI生成があれば画像、無ければlucideアイコンにフォールバック）
  const genreIconMap = await getGenreIconMap();

  // 実データのみ表示（出品が無いときは「入荷待ち」を表示する）
  const listings: ListingWithImages[] = await getCachedFeaturedListings();

  // Favorites are user-specific — fetched per request using the auth client
  const favoritedIds = await favoritedSet(supabase, user?.id, listings.map((l) => l.id));

  // 売却実績スライダー：実際の成約（エスクロー完了）から構築。3件未満ならサンプル表示。
  let saleItems: { pref: string; type: 'sold' | 'direct'; car: string; price: string; car_e: string; face_e: string }[] = [];
  try {
    const { data: soldRows } = await (supabase as any)
      .from('escrow_transactions')
      .select('amount, created_at, listings(title, prefecture, dealer_id)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(12);
    saleItems = ((soldRows ?? []) as any[])
      .filter((r) => r.listings?.title)
      .map((r) => ({
        pref: r.listings?.prefecture || '全国',
        type: r.listings?.dealer_id ? 'direct' : 'sold',
        car: r.listings.title as string,
        price: `¥${Number(r.amount ?? 0).toLocaleString('ja-JP')}`,
        car_e: '🚗',
        face_e: '✅',
      }));
  } catch { saleItems = []; }

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
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://buymo.me/listings?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <div className="-mx-4 -mt-6">

        {/* ── 0. スマホ最優先：売る / 買う の2択 ── */}
        <section className="bg-white px-4 pb-2 pt-5 lg:hidden">
          <p className="mb-3 text-center text-sm font-black text-slate-700">まずは選んでください</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/listings/valuation" className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-800 p-5 text-center text-white shadow-sm active:scale-[0.98]">
              <Banknote className="h-8 w-8 text-accent-200" />
              <span className="text-lg font-black">車を売る</span>
              <span className="text-[11px] text-white/80">無料査定・買取・出品</span>
            </Link>
            <Link href="/listings" className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 p-5 text-center text-[#2E2408] shadow-sm active:scale-[0.98]">
              <Car className="h-8 w-8 text-[#5a4a12]" />
              <span className="text-lg font-black">車を買う</span>
              <span className="text-[11px] text-[#5a4a12]/80">在庫から探す</span>
            </Link>
          </div>
          {!hideBiz && (
            <div className="mt-2 flex justify-center gap-4 text-[11px] font-bold text-slate-400">
              <Link href="/join" className="hover:text-slate-600">加盟店・プロ登録</Link>
            </div>
          )}
        </section>

        {/* ── 1. Hero（人物＋車の実写真・分割レイアウト）── */}
        <section className="bg-gradient-to-br from-navy-800 to-navy-900">
          <div className="mx-auto grid max-w-7xl items-stretch lg:grid-cols-2">
            {/* テキストパネル */}
            <div className="order-2 px-5 py-10 text-center text-white sm:px-8 lg:order-1 lg:py-16 lg:text-left xl:px-12">
              <h1 className="text-4xl font-black leading-[1.16] text-white sm:text-5xl xl:text-[56px]">
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

              {/* 人気メーカーチップ */}
              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                {POPULAR_MAKERS.map((maker) => (
                  <Link
                    key={maker}
                    href={`/listings?maker=${encodeURIComponent(maker)}`}
                    className="rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25"
                  >
                    {maker}
                  </Link>
                ))}
                <Link
                  href="/listings"
                  className="rounded-full border border-dashed border-white/40 px-3.5 py-1.5 text-sm font-bold text-white/80 transition hover:border-white/70 hover:text-white"
                >
                  すべて →
                </Link>
              </div>
            </div>

            {/* 人物＋車の写真 */}
            <div className="relative order-1 min-h-[260px] overflow-hidden sm:min-h-[360px] lg:order-2 lg:min-h-full">
              <Image
                src="/images/buymo/hero-premium.webp"
                alt="ディーラー前に佇むプレミアムSUV（BUYMO ダイレクトのイメージ）"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="kenburns object-cover object-center lg:object-[60%_center]"
              />
              {/* パネルへ自然になじませる（lg以上は左端、モバイルは下端をぼかす） */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 to-transparent lg:bg-gradient-to-r lg:from-navy-900/70 lg:via-navy-900/10 lg:to-transparent" />
              {/* 安心サポートのエンブレム */}
              <div className="absolute bottom-4 right-4 hidden flex-col items-center rounded-2xl border border-gold-500/60 bg-navy-900/70 px-4 py-2.5 text-center backdrop-blur sm:flex">
                <span className="text-[10px] font-bold text-gold-500">中古車取引の</span>
                <span className="text-sm font-black leading-tight text-white">安心サポート</span>
                <span className="mt-0.5 text-[9px] font-bold tracking-widest text-white/70">BUYMO DIRECT</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 1.5 BUYMO ロゴ（別枠）── */}
        <section className="bg-gradient-to-b from-navy-50 to-white px-4 py-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-5">
            <div className="flex items-center text-navy-500">
              <span className="flex items-center gap-1.5 text-3xl font-black tracking-tight leading-none sm:text-4xl">
                BUYMO<span className="rounded-md bg-gold-500 px-2 py-0.5 text-2xl font-black leading-none text-navy-900 sm:text-3xl">BD</span>
              </span>
            </div>
            <p className="text-center text-sm font-bold text-navy-700 sm:text-left sm:text-base">
              愛車の売却も、次のクルマ探しも。<br className="hidden sm:block" />
              BUYMO がまるごとサポートします。
            </p>
          </div>
        </section>

        {/* ── 1.7 サービス4導線（売る／買う／整備・保証／加盟店を探す）── */}
        <section className="bg-white px-4 pb-4 pt-8 sm:pt-12">
          <div className="mx-auto max-w-6xl">
            <div data-reveal className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { href: '/listings/valuation', img: '/images/buymo/sell-card.webp', title: '車を売りたい', sub: 'プロの買取で高価売却を目指す' },
                { href: '/listings', img: '/images/buymo/buy-card.webp', title: '車を買いたい', sub: '厳選された中古車から理想の一台を' },
                { href: '/dealers?category=整備・修理', img: '/images/buymo/inspection-card.webp', title: '整備・保証', sub: '購入後も安心のサポート体制' },
                { href: '/dealers', img: '/images/buymo/dealer-atmosphere.webp', title: '加盟店を探す', sub: '信頼できる車のプロに相談' },
              ].map(({ href, img, title, sub }) => (
                <Link
                  key={title}
                  href={href}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:aspect-[5/4]"
                >
                  <Image
                    src={img}
                    alt={title}
                    fill
                    sizes="(max-width:1024px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  {/* テキストは画像に焼き込まず、HTML/CSSでオーバーレイ */}
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

        {/* ── 1.8 選ばれる3つの理由 ── */}
        <section className="bg-gradient-to-br from-accent-50 to-white px-4 py-12">
          <div className="mx-auto max-w-5xl rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-accent-200 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-black text-navy-800 sm:text-2xl">
              <span className="inline-block h-5 w-1.5 rounded bg-accent-500" />選ばれる3つの理由
            </h2>
            <p className="mt-1 text-sm text-slate-500">BUYMO ダイレクトが、安心してご利用いただける理由</p>
            <div data-reveal className="mt-6 grid gap-5 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: '安心のエスクロー決済', desc: 'お金のやり取りも安全' },
                { icon: FileCheck2, title: '名義変更を代行', desc: '面倒な手続きもおまかせ' },
                { icon: MapPin, title: '全国の加盟店ネットワーク', desc: 'お近くのプロが対応' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-navy-800">{title}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. 価値訴求バー ── */}
        <section className="bg-navy-500 py-6 text-white">
          <div data-reveal className="mx-auto grid max-w-5xl grid-cols-2 gap-y-5 px-4 text-center sm:grid-cols-4 sm:divide-x sm:divide-white/20">
            <div className="px-4">
              <p className="text-lg font-black sm:text-xl">買取保証つき</p>
              <p className="mt-0.5 text-xs opacity-70">売れなくても安心</p>
            </div>
            <div className="px-4">
              <p className="text-lg font-black sm:text-xl">エスクロー決済</p>
              <p className="mt-0.5 text-xs opacity-70">第三者がお金を預かる</p>
            </div>
            <div className="px-4">
              <p className="text-lg font-black sm:text-xl">全国47都道府県</p>
              <p className="mt-0.5 text-xs opacity-70">どこでもオンライン完結</p>
            </div>
            <div className="px-4">
              <p className="text-lg font-black sm:text-xl">名義変更まで代行</p>
              <p className="mt-0.5 text-xs opacity-70">面倒な手続きもおまかせ</p>
            </div>
          </div>
        </section>

        {/* ── 2.2 最近の成約実績（実データが3件以上あるときだけ表示。「ご利用実績」との重複を避ける） ── */}
        {saleItems.length >= 3 && <SaleResultsSlider items={saleItems} />}

        {/* ── 2.3 ご利用実績ギャラリー（AI生成画像。3枚以上で表示） ── */}
        <CustomerResults />

        {/* ── 2.5 2つの売り方（買取／ダイレクト販売） ── */}
        <section className="bg-white px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">Choice</p>
            <h2 className="mb-8 text-center text-2xl font-black sm:text-3xl">2つの売り方から選べる</h2>
            <div data-reveal className="grid gap-5 md:grid-cols-2">
              {/* 買取 */}
              <div className="card flex flex-col p-7 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <span className="self-start rounded-full bg-coral-50 px-3 py-1 text-xs font-black text-coral-700">買取</span>
                <h3 className="mt-3 text-xl font-black text-navy-800">BUYMOが直接買い取り</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  とにかく早く・確実に現金化したい方に。写真を送るだけで査定、最短で入金します。
                </p>
                <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="font-black text-accent-600">✓</span>写真査定でネット完結</li>
                  <li className="flex gap-2"><span className="font-black text-accent-600">✓</span>最短3営業日で入金</li>
                  <li className="flex gap-2"><span className="font-black text-accent-600">✓</span>手数料0円・無料引取り</li>
                </ul>
                <Link href="/listings/valuation" className="btn-outline mt-6 w-full py-3">無料査定を申し込む</Link>
              </div>
              {/* ダイレクト販売 */}
              <div className="card relative flex flex-col p-7 ring-1 ring-gold-500/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-2 self-start">
                  <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-black text-gold-600">ダイレクト販売</span>
                  <span className="rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-black text-navy-900">おすすめ</span>
                </div>
                <h3 className="mt-3 text-xl font-black text-navy-800">買取保証つきで、高く売る</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  時間をかけても高く売りたい方に。出品して直接販売、売れなければBUYMOが買取保証。
                </p>
                <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="font-black text-accent-600">✓</span>買取保証つきだから安心</li>
                  <li className="flex gap-2"><span className="font-black text-accent-600">✓</span>エスクロー決済で安全取引</li>
                  <li className="flex gap-2"><span className="font-black text-accent-600">✓</span>全国オンラインで完結</li>
                </ul>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Link href="/listings" className="btn-gold flex-1 py-3">ダイレクト販売を見る</Link>
                  <Link href="/sell" className="btn-outline flex-1 py-3">出品する</Link>
                </div>
              </div>
            </div>

            {/* 廃車・事故車・不動車（買取専門） */}
            <Link
              href="/haisha"
              className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-5 transition hover:border-navy-300 sm:flex-row sm:items-center"
            >
              <Recycle className="h-7 w-7 shrink-0 text-navy-500" />
              <div className="min-w-0">
                <p className="text-base font-black text-navy-800">廃車・事故車・不動車は「その場提示」買取</p>
                <p className="text-sm text-slate-600">全国買取価格表をもとに金額を即提示。還付金も別枠で計算、無料引取り・抹消手続き対応。</p>
              </div>
              <span className="btn-primary shrink-0 px-5 py-2.5 text-sm sm:ml-auto">買取額を見る →</span>
            </Link>
          </div>
        </section>


        {/* ── 3. 車種・ジャンルから探す（車種＋ジャンルを1セクションに統合） ── */}
        <section className="bg-[#F5F9F8] px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Browse</p>
                <h2 className="mt-1 flex items-center gap-1.5 text-xl font-black"><Tag className="h-5 w-5 text-accent-600" />車種・ジャンルから探す</h2>
                <p className="mt-1 text-sm text-slate-500">ボディタイプから、人気車種・事故車/廃車・輸入車・パーツまで。買取もダイレクト販売も。</p>
              </div>
              <Link href="/genre" className="hidden shrink-0 text-sm font-bold text-accent-600 hover:underline sm:block">すべてのジャンル →</Link>
            </div>

            {/* 車種（ボディタイプ） */}
            <div data-reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {BODY_TYPES.slice(0, 6).map((body) => (
                <Link
                  key={body}
                  href={`/listings?body=${encodeURIComponent(body)}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#EBFAF6]">
                    {BODY_ICON[body] ? (
                      <Image
                        src={BODY_ICON[body]}
                        alt={body}
                        fill
                        sizes="(max-width:640px) 50vw, 16vw"
                        className="object-contain p-1 transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={BODY_IMG[body] ?? '/cars/sedan.jpg'}
                        alt={body}
                        fill
                        sizes="(max-width:640px) 50vw, 16vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="py-2.5 text-center text-sm font-bold text-slate-700 group-hover:text-accent-600">
                    {body}
                  </div>
                </Link>
              ))}
            </div>

            {/* ジャンル */}
            <div data-reveal className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {/* ボディタイプ（軽自動車/SUV/ミニバン）と重複する kei/suv/minivan は除外して凝縮 */}
              {['alphard', 'hiace', 'prius', 'jimny', 'jiko', 'haisha', 'ev', 'import', 'truck']
                .map((s) => GENRES.find((g) => g.slug === s))
                .filter((g): g is NonNullable<typeof g> => Boolean(g))
                .map((g) => {
                  const Icon = GENRE_ICON[g.slug] ?? Car;
                  const localSvg = GENRE_IMG[g.slug];
                  const genUrl = genreIconMap[g.slug];
                  return (
                    <Link key={g.slug} href={`/genre/${g.slug}`}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-md">
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-accent-50 to-[#F5F9F8]">
                        {localSvg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={localSvg} alt={g.label} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        ) : genUrl ? (
                          <Image src={genUrl} alt={g.label} fill sizes="(max-width:640px) 50vw, 16vw" className="object-cover transition duration-300 group-hover:scale-105" />
                        ) : (
                          <Icon className="h-8 w-8 text-accent-600 transition duration-300 group-hover:scale-110" />
                        )}
                      </div>
                      <div className="py-2.5 text-center text-sm font-bold text-slate-700 group-hover:text-accent-600">{g.label}</div>
                    </Link>
                  );
                })}
            </div>
            <Link href="/genre" className="mt-4 block text-center text-sm font-bold text-accent-600 hover:underline sm:hidden">すべてのジャンルを見る →</Link>
          </div>
        </section>

        {/* ── 3.5 エリアから探す ── */}
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Area</p>
            <h2 className="mb-1 mt-1 text-xl font-black">エリアから探す</h2>
            <p className="mb-5 text-sm text-slate-500">全国47都道府県対応。お住まいの地域の出品車・買取査定を。</p>
            <div data-reveal className="flex flex-wrap gap-2.5">
              {['hokkaido', 'miyagi', 'tokyo', 'kanagawa', 'saitama', 'chiba', 'aichi', 'shizuoka', 'osaka', 'hyogo', 'hiroshima', 'fukuoka']
                .map((s) => AREAS.find((a) => a.slug === s))
                .filter((a): a is NonNullable<typeof a> => Boolean(a))
                .map((a) => (
                  <Link key={a.slug} href={`/area/${a.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:text-accent-600">
                    <MapPin className="h-3.5 w-3.5 text-accent-500" />{a.name}
                  </Link>
                ))}
              <Link href="/area" className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-400 transition hover:border-accent-400 hover:text-accent-600">
                全国から探す →
              </Link>
            </div>
          </div>
        </section>

        {/* ── 4. How it works ── */}
        <section className="bg-navy-700 px-4 py-16 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-500">
              How it works
            </p>
            <h2 className="mb-10 text-center text-2xl font-black sm:text-3xl">
              かんたん4ステップで売買完了
            </h2>
            <HowItWorksTabs />
          </div>
        </section>

        {/* ── 5. BUYMOダイレクトが選ばれる理由（買取保証・安心の仕組み）── */}
        <section className="bg-white px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">
              Why BUYMO
            </p>
            <h2 className="mb-2 text-center text-2xl font-black">BUYMOダイレクトが選ばれる理由</h2>
            <p className="mb-8 text-center text-sm text-slate-500">買取保証つき・エスクロー決済で、はじめての個人間売買でも安心。</p>
            <div data-reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SAFETY_POINTS.map(({ icon: Icon, title, desc, box, ic }) => (
                <div key={title} className="card group flex flex-col items-center gap-3 p-6 text-center transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${box}`}>
                    <Icon className={`h-6 w-6 transition group-hover:text-white ${ic}`} />
                  </div>
                  <h3 className="font-bold text-navy-700">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. 加盟店セクション（一般会員には出さない） ── */}
        {!hideBiz && (
        <section className="bg-navy-50 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-navy-400">
              For Dealers
            </p>
            <h2 className="mb-10 text-center text-2xl font-black text-navy-500">加盟店として出品する</h2>
            <div data-reveal className="grid gap-10 lg:grid-cols-2 lg:gap-14">
              {/* Left: pitch */}
              <div className="flex flex-col justify-center">
                <h3 className="mb-5 text-xl font-black leading-snug text-navy-500">
                  プロの販売網を持つなら<br />加盟店登録を
                </h3>
                <ul className="mb-7 space-y-4">
                  {DEALER_BULLETS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-50">
                        <Icon className="h-4 w-4 text-accent-600" />
                      </div>
                      <span className="text-sm text-slate-600">{text}</span>
                    </li>
                  ))}
                </ul>
                <div>
                  <Link href="/join" className="btn-primary px-6 py-3 text-sm">
                    加盟店・プロ登録（無料）
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right: 募集中カード */}
              <div className="card flex flex-col justify-center gap-4 p-8 text-center">
                <span className="mx-auto rounded-full bg-navy-50 px-3 py-1 text-xs font-black tracking-wide text-navy-600">加盟店募集中</span>
                <h3 className="text-lg font-black text-navy-700">在庫を BUYMO ダイレクトに<br />掲載しませんか？</h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  API在庫連携で自動出品、専用ダッシュボードで成約・在庫を一元管理。<br />
                  個人出品より優遇された手数料でご利用いただけます。
                </p>
                <div>
                  <Link href="/join" className="btn-primary px-6 py-3 text-sm">まずは無料で登録・相談する</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── 8. 新着車両 ── */}
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">人気の中古車</h2>
              <Link
                href="/listings"
                className="flex items-center gap-0.5 text-sm font-bold text-accent-600 hover:underline"
              >
                すべて見る <ChevronRight className="h-4 w-4" />
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

        {/* ── 8.5 コラム ── */}
        <section className="bg-[#F5F9F8] px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="flex items-center gap-1.5 text-xl font-black"><BookOpen className="h-5 w-5 text-accent-600" />お役立ちコラム</h2>
              <Link href="/column" className="shrink-0 text-sm font-bold text-accent-600 hover:underline">すべて見る →</Link>
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

        {/* ── 8.7 お困りごと相談窓口（故障・修理など） ── */}
        <section className="bg-[#F5F9F8] px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-widest text-accent-600">
              <LifeBuoy className="h-4 w-4" />Support
            </p>
            <h2 className="mb-2 text-center text-2xl font-black">故障・修理など、お困りごと相談窓口</h2>
            <p className="mb-8 text-center text-sm text-slate-500">車のトラブルから各種手続きまで。最適な窓口へご案内します。</p>
            <div data-reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Wrench, tint: 'bg-coral-50', fg: 'text-coral-600', title: '故障・修理', desc: '認定整備プロに相談・依頼。車検・板金・電装まで対応。', href: '/dealers?category=整備・修理', cta: 'プロを探す' },
                { icon: Recycle, tint: 'bg-leaf-50', fg: 'text-leaf-600', title: '廃車・事故車・不動車', desc: 'その場提示で買取。無料引取り・還付金もご案内。', href: '/haisha', cta: '買取額を見る' },
                { icon: CreditCard, tint: 'bg-sky-50', fg: 'text-sky-600', title: 'ローン・お支払い', desc: '分割・お支払いのご相談や審査のお申し込み。', href: '/loan/apply', cta: '相談・申込' },
                { icon: Mail, tint: 'bg-violet-50', fg: 'text-violet-600', title: 'その他のご相談', desc: 'どこに相談するか迷ったら、まずはこちらへ。', href: '/contact', cta: '問い合わせる' },
              ].map(({ icon: Icon, tint, fg, title, desc, href, cta }) => (
                <Link key={title} href={href} className="card group flex flex-col gap-3 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}>
                    <Icon className={`h-5 w-5 ${fg}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-navy-800 group-hover:text-accent-700">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
                  </div>
                  <span className="mt-auto text-xs font-bold text-accent-600">{cta} →</span>
                </Link>
              ))}
            </div>

            {/* 専門の「車のプロ」に直接依頼（旧「車のプロに依頼する」を統合） */}
            <div data-reveal className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-navy-800">専門の「車のプロ」に直接依頼</h3>
                  <p className="mt-1 text-sm text-slate-600">整備・車検・板金・コーティング・電装・陸送まで、認定プロに直接依頼できます。</p>
                </div>
                <Link href="/dealers" className="btn-primary px-5 py-2.5 text-sm">プロを探す →</Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ['整備・修理', '整備・車検・板金', 'bg-navy-500', 'hover:border-navy-500 hover:text-navy-600'],
                  ['美装', 'コーティング・洗車', 'bg-sky-500', 'hover:border-sky-500 hover:text-sky-600'],
                  ['電装・取付', 'ナビ・ドラレコ', 'bg-violet-500', 'hover:border-violet-500 hover:text-violet-600'],
                  ['物流・手続き', '陸送・名義変更', 'bg-amber-500', 'hover:border-amber-500 hover:text-amber-600'],
                  ['査定・買取', '査定・買取', 'bg-coral-500', 'hover:border-coral-500 hover:text-coral-700'],
                ].map(([cat, label, dot, hov]) => (
                  <Link
                    key={cat}
                    href={`/dealers?category=${encodeURIComponent(cat)}`}
                    className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-600 transition ${hov}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. 出品CTA ── */}
        <section className="bg-navy-500 px-4 py-16 text-center text-white">
          <h2 data-reveal className="text-2xl font-black sm:text-3xl">あなたの車を今すぐ売りませんか？</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-navy-200">
            出品は無料。業者より高く売れる可能性があります。
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/sell" className="btn-gold px-7 py-3 text-base">
              無料で出品する
            </Link>
            <Link href="/listings" className="btn-outline px-7 py-3 text-base">
              車を探す
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
