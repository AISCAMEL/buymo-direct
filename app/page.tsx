import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ShieldCheck,
  MessageSquare,
  FileCheck2,
  ChevronRight,
  Banknote,
  Zap,
  LayoutDashboard,
  Tag,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/ListingGrid';
import { favoritedSet } from '@/lib/favorites';
import { BODY_TYPES } from '@/lib/constants';
import { GENRES, AREAS } from '@/lib/catalog';
import { COLUMNS } from '@/lib/columns';
import { HowItWorksTabs } from '@/components/HowItWorksTabs';
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

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'エスクロー決済' },
  { icon: FileCheck2, label: '名義変更代行' },
  { icon: Banknote, label: '出品手数料¥0' },
];

const SAFETY_POINTS = [
  {
    icon: ShieldCheck,
    title: '買取保証つき',
    desc: '万一売れなくても、BUYMOが買い取り。売り手も安心して出品できます。',
  },
  {
    icon: Banknote,
    title: 'エスクロー決済',
    desc: '代金は第三者が一時お預かり。車と代金の受け渡しを安全に行えます。',
  },
  {
    icon: FileCheck2,
    title: '本人確認・名義変更',
    desc: '出品者・購入者の本人確認を実施。面倒な名義変更手続きも代行します。',
  },
  {
    icon: MessageSquare,
    title: 'チャット＆取引監視',
    desc: 'サイト内チャットで直接やりとり。不審な取引は運営が監視・対応します。',
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

  // 実データのみ表示（出品が無いときは「入荷待ち」を表示する）
  const listings: ListingWithImages[] = await getCachedFeaturedListings();

  // Favorites are user-specific — fetched per request using the auth client
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

        {/* ── 1. Hero（人物＋車の実写真・分割レイアウト）── */}
        <section className="bg-gradient-to-br from-navy-800 to-navy-900">
          <div className="mx-auto grid max-w-7xl items-stretch lg:grid-cols-2">
            {/* テキストパネル */}
            <div className="order-2 px-5 py-10 text-center text-white sm:px-8 lg:order-1 lg:py-16 lg:text-left xl:px-12">
              <p className="mb-3 inline-block rounded-full bg-white/12 px-4 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                🚗 買取保証つき 中古車ダイレクト販売
              </p>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl xl:text-5xl">
                売るのも、買うのも、<span className="text-accent-200">BUYMO</span>。<br />
                買取も、ダイレクト販売も。
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-base lg:mx-0">
                すぐ現金化したいなら「買取」。もっと高く売りたいなら「ダイレクト販売」。どちらも写真査定・全国オンライン完結、買取保証つきで安心。
              </p>

              {/* ベネフィットのチップ */}
              <ul className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2 text-xs font-bold text-white lg:mx-0 lg:justify-start">
                <li className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/20">買取保証つき</li>
                <li className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/20">エスクロー決済で安心</li>
                <li className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/20">全国47都道府県対応</li>
                <li className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/20">オンライン完結</li>
              </ul>

              {/* 検索バー */}
              <form
                action="/listings"
                className="mx-auto mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 lg:mx-0"
              >
                <input
                  name="q"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
                  placeholder="車名・メーカー・モデルで検索"
                />
                <button type="submit" className="btn-accent shrink-0 rounded-xl px-5 py-2.5">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">検索</span>
                </button>
              </form>

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

              {/* 信頼バッジ */}
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-4 py-1.5 text-xs font-bold text-white ring-1 ring-white/20"
                  >
                    <Icon className="h-3.5 w-3.5 text-accent-200" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* 人物＋車の写真 */}
            <div className="relative order-1 min-h-[260px] sm:min-h-[360px] lg:order-2 lg:min-h-full">
              <Image
                src="/hero-photo.jpg"
                alt="スマホで愛車を撮影して査定を申し込む様子（写真査定・全国オンライン完結）"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              {/* パネルへ自然になじませる（lg以上は左端、モバイルは下端をぼかす） */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 to-transparent lg:bg-gradient-to-r lg:from-navy-900/70 lg:via-navy-900/10 lg:to-transparent" />
            </div>
          </div>
        </section>

        {/* ── 1.5 BUYMO マスコット（別枠）── */}
        <section className="bg-gradient-to-b from-navy-50 to-white px-4 py-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Image
              src="/buymo-mascot.png"
              alt="BUYMO マスコット"
              width={320}
              height={240}
              className="h-auto w-[160px] drop-shadow-md sm:w-[200px]"
            />
            <p className="text-center text-sm font-bold text-navy-700 sm:text-left sm:text-base">
              愛車の売却も、次のクルマ探しも。<br className="hidden sm:block" />
              BUYMO がまるごとサポートします。
            </p>
          </div>
        </section>

        {/* ── 2. 価値訴求バー ── */}
        <section className="bg-navy-500 py-6 text-white">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-5 px-4 text-center sm:grid-cols-4 sm:divide-x sm:divide-white/20">
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

        {/* ── 2.5 2つの売り方（買取／ダイレクト販売） ── */}
        <section className="bg-white px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">Choice</p>
            <h2 className="mb-8 text-center text-2xl font-black sm:text-3xl">2つの売り方から選べる</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {/* 買取 */}
              <div className="card flex flex-col p-7">
                <span className="self-start rounded-full bg-navy-50 px-3 py-1 text-xs font-black text-navy-600">買取</span>
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
              <div className="card flex flex-col p-7 ring-1 ring-gold-500/40">
                <span className="self-start rounded-full bg-gold-100 px-3 py-1 text-xs font-black text-gold-600">ダイレクト販売</span>
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
          </div>
        </section>

        {/* ── 3. 車種から探す ── */}
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-5 text-xl font-black">車種から探す</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {BODY_TYPES.slice(0, 6).map((body) => (
                <Link
                  key={body}
                  href={`/listings?body=${encodeURIComponent(body)}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <Image
                      src={BODY_IMG[body] ?? '/cars/sedan.jpg'}
                      alt={body}
                      fill
                      sizes="(max-width:640px) 50vw, 16vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="py-2.5 text-center text-sm font-bold text-slate-700 group-hover:text-accent-600">
                    {body}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3.2 ジャンルから探す ── */}
        <section className="bg-[#F5F9F8] px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-1.5 text-xl font-black"><Tag className="h-5 w-5 text-accent-600" />ジャンルから探す</h2>
                <p className="mt-1 text-sm text-slate-500">人気車種・事故車/廃車・輸入車・パーツまで。買取もダイレクト販売も。</p>
              </div>
              <Link href="/genre" className="hidden shrink-0 text-sm font-bold text-accent-600 hover:underline sm:block">すべてのジャンル →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {['kei', 'suv', 'minivan', 'alphard', 'hiace', 'prius', 'jimny', 'jiko', 'haisha', 'ev', 'import', 'truck']
                .map((s) => GENRES.find((g) => g.slug === s))
                .filter((g): g is NonNullable<typeof g> => Boolean(g))
                .map((g) => (
                  <Link key={g.slug} href={`/genre/${g.slug}`}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-md">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <Image src={`/genre/${g.slug}.jpg`} alt={g.label} fill sizes="(max-width:640px) 50vw, 16vw" className="object-cover transition duration-300 group-hover:scale-105" />
                    </div>
                    <div className="py-2.5 text-center text-sm font-bold text-slate-700 group-hover:text-accent-600">{g.label}</div>
                  </Link>
                ))}
            </div>
            <Link href="/genre" className="mt-4 block text-center text-sm font-bold text-accent-600 hover:underline sm:hidden">すべてのジャンルを見る →</Link>
          </div>
        </section>

        {/* ── 3.5 エリアから探す ── */}
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-1 text-xl font-black">エリアから探す</h2>
            <p className="mb-5 text-sm text-slate-500">全国47都道府県対応。お住まいの地域の出品車・買取査定を。</p>
            <div className="flex flex-wrap gap-2.5">
              {['hokkaido', 'miyagi', 'tokyo', 'kanagawa', 'saitama', 'chiba', 'aichi', 'shizuoka', 'osaka', 'hyogo', 'hiroshima', 'fukuoka']
                .map((s) => AREAS.find((a) => a.slug === s))
                .filter((a): a is NonNullable<typeof a> => Boolean(a))
                .map((a) => (
                  <Link key={a.slug} href={`/area/${a.slug}`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:text-accent-600">
                    {a.name}
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
        <section className="bg-white px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">
              Why BUYMO
            </p>
            <h2 className="mb-2 text-center text-2xl font-black">BUYMOダイレクトが選ばれる理由</h2>
            <p className="mb-8 text-center text-sm text-slate-500">買取保証つき・エスクロー決済で、はじめての個人間売買でも安心。</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SAFETY_POINTS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50">
                    <Icon className="h-6 w-6 text-accent-600" />
                  </div>
                  <h3 className="font-bold text-navy-700">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. 加盟店セクション ── */}
        <section className="bg-navy-50 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-navy-400">
              For Dealers
            </p>
            <h2 className="mb-10 text-center text-2xl font-black text-navy-500">加盟店として出品する</h2>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
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
                  <Link href="/dealer/register" className="btn-primary px-6 py-3 text-sm">
                    加盟店申請する
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
                  <Link href="/dealer/register" className="btn-primary px-6 py-3 text-sm">加盟店として申請する</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. 新着車両 ── */}
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">新着の出品車両</h2>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.slice(0, 4).map((c) => (
                <Link key={c.slug} href={`/column/${c.slug}`} className="card group flex flex-col p-5 transition hover:shadow-md">
                  <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-600">{c.cat}</span>
                  <h3 className="line-clamp-3 text-sm font-bold text-navy-800 group-hover:text-accent-600">{c.title}</h3>
                  <span className="mt-3 text-xs font-bold text-accent-600">続きを読む →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. 出品CTA ── */}
        <section className="bg-navy-500 px-4 py-16 text-center text-white">
          <h2 className="text-2xl font-black sm:text-3xl">あなたの車を今すぐ売りませんか？</h2>
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
