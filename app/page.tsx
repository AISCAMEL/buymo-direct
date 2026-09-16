import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ShieldCheck,
  MessageSquare,
  FileCheck2,
  ChevronRight,
  Banknote,
  Building2,
  Zap,
  LayoutDashboard,
  Tag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/ListingGrid';
import { favoritedSet } from '@/lib/favorites';
import { BODY_TYPES } from '@/lib/constants';
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

const REASONS = [
  {
    icon: MessageSquare,
    title: '直接メッセージで交渉',
    desc: '出品者と1対1でやり取り。価格・受け渡し方法を柔軟に相談できます。',
  },
  {
    icon: ShieldCheck,
    title: 'エスクロー決済で安心',
    desc: '代金は第三者が一時保全。現車確認後に売主へ送金されます。',
  },
  {
    icon: FileCheck2,
    title: '名義変更まで代行',
    desc: '行政書士が書類作成〜陸運局手続きを代行。遠隔地も対応。',
  },
  {
    icon: Building2,
    title: '認定加盟店で安心購入',
    desc: '全国の認定加盟店も出品中。品質保証付きの在庫も多数掲載。',
  },
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

        {/* ── 1. Hero ── */}
        <section className="bg-gradient-to-b from-navy-50 to-white px-4 pb-14 pt-16 text-center">
          <p className="mb-3 inline-block rounded-full bg-accent-50 px-4 py-1 text-xs font-bold text-accent-600">
            🚗 買取保証つき 中古車ダイレクト販売
          </p>
          <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-5xl">
            保証つきだから<span className="text-accent-600">安心</span>。<br />
            クルマの売買、オンライン完結。
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 sm:text-base">
            査定・出品・販売・エスクロー決済まで、BUYMOがまるごとサポート。全国どこでも、安心してクルマを売れる・買える。
          </p>

          {/* ベネフィットのチップ（buymo.me風） */}
          <ul className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2 text-xs font-bold text-navy-600">
            <li className="rounded-full bg-navy-50 px-3 py-1">買取保証つき</li>
            <li className="rounded-full bg-navy-50 px-3 py-1">エスクロー決済で安心</li>
            <li className="rounded-full bg-navy-50 px-3 py-1">全国47都道府県対応</li>
            <li className="rounded-full bg-navy-50 px-3 py-1">オンライン完結</li>
          </ul>

          {/* 検索バー */}
          <form
            action="/listings"
            className="mx-auto mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-md ring-1 ring-slate-200"
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
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {POPULAR_MAKERS.map((maker) => (
              <Link
                key={maker}
                href={`/listings?maker=${encodeURIComponent(maker)}`}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-accent-500 hover:text-accent-600"
              >
                {maker}
              </Link>
            ))}
            <Link
              href="/listings"
              className="rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-sm font-bold text-slate-400 transition hover:border-accent-400 hover:text-accent-600"
            >
              すべて →
            </Link>
          </div>

          {/* 信頼バッジ */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-accent-600" />
                {label}
              </span>
            ))}
          </div>

          {/* BUYMO マスコット */}
          <div className="mt-8 flex justify-center">
            <Image
              src="/buymo-mascot.png"
              alt="BUYMO マスコット"
              width={320}
              height={240}
              priority
              className="h-auto w-[220px] drop-shadow-md sm:w-[300px]"
            />
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

        {/* ── 5. 安心の理由 (4 cards) ── */}
        <section className="bg-slate-50 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">
              Why BUYMO
            </p>
            <h2 className="mb-8 text-center text-2xl font-black">BUYMOが選ばれる4つの理由</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {REASONS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50">
                    <Icon className="h-5 w-5 text-accent-600" />
                  </div>
                  <h3 className="mt-3 font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. 安心の仕組み ── */}
        <section className="bg-white px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">
              Safety
            </p>
            <h2 className="mb-8 text-center text-2xl font-black">安心して取引できる仕組み</h2>
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
