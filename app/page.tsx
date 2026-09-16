import Link from 'next/link';
import {
  Search,
  ShieldCheck,
  MessageSquare,
  FileCheck2,
  ChevronRight,
  Banknote,
  Building2,
  Star,
  Zap,
  LayoutDashboard,
  Tag,
  Car,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/ListingGrid';
import { favoritedSet } from '@/lib/favorites';
import { BODY_TYPES } from '@/lib/constants';
import { HowItWorksTabs } from '@/components/HowItWorksTabs';
import { getCachedFeaturedListings, getCachedListingStats } from '@/lib/cache';
import { DEMO_LISTINGS } from '@/lib/demo-data';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 300; // ISR: home page rebuilds at most once per 5 minutes

const POPULAR_MAKERS = ['トヨタ', 'ホンダ', '日産', 'マツダ', 'スバル', 'スズキ', 'ダイハツ', '三菱'];

const BODY_EMOJI: Record<string, string> = {
  '軽自動車': '🚗',
  'コンパクト': '🚘',
  'セダン': '🚙',
  'SUV': '🛻',
  'ミニバン': '🚐',
  'ワゴン': '🚌',
  'クーペ': '🏎️',
  'オープン': '🚗',
  'その他': '🚗',
};

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'エスクロー決済' },
  { icon: FileCheck2, label: '名義変更代行' },
  { icon: Banknote, label: '個人間手数料¥0' },
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

const TESTIMONIALS = [
  {
    initial: '田',
    avatarBg: 'bg-blue-500',
    name: '田中 圭一',
    role: '個人売主 / 東京都',
    rating: 5,
    date: '2026年5月',
    comment:
      'プリウスを売却。業者に見積もりを取ったら150万円と言われたのに、BUYMOでは210万円で売れました。エスクローで入金を確認してから引き渡せるのが安心でした。',
  },
  {
    initial: '佐',
    avatarBg: 'bg-rose-500',
    name: '佐藤 由美',
    role: '購入者 / 大阪府',
    rating: 5,
    date: '2026年4月',
    comment:
      '初めての個人間取引で心配でしたが、メッセージでのやりとりがスムーズで、名義変更も代行してもらえてとても楽でした。',
  },
  {
    initial: '山',
    avatarBg: 'bg-amber-500',
    name: '山田 健太',
    role: '加盟店スタッフ / 愛知県',
    rating: 5,
    date: '2026年3月',
    comment:
      '加盟店として在庫をAPI連携で自動登録できるのが便利。月の成約台数が1.5倍になりました。',
  },
];

const DEALER_BULLETS = [
  { icon: Zap, text: '在庫DMS連携API — 在庫データを自動同期' },
  { icon: LayoutDashboard, text: '専用管理ダッシュボード — 成約・在庫を一元管理' },
  { icon: Tag, text: '成約手数料優遇 — 個人より低い手数料率' },
];

const FOOTER_LINKS = [
  {
    heading: '使い方',
    links: [
      { label: '車を探す', href: '/listings' },
      { label: '出品する', href: '/sell' },
      { label: 'ローン審査', href: '/loan/apply' },
      { label: '加盟店一覧', href: '/dealers' },
    ],
  },
  {
    heading: 'サービス',
    links: [
      { label: 'エスクロー', href: '/listings' },
      { label: '名義変更代行', href: '/listings' },
      { label: '無料査定', href: '/listings/valuation' },
      { label: '陸送手配', href: '/transport' },
    ],
  },
  {
    heading: '加盟店',
    links: [
      { label: '加盟店申請', href: '/dealer/register' },
      { label: 'ログイン', href: '/dealer/dashboard' },
      { label: 'API仕様', href: '/dealer/api-keys' },
      { label: 'Webhook', href: '/dealer/settings' },
    ],
  },
  {
    heading: '運営',
    links: [
      { label: 'プライバシーポリシー', href: '/privacy' },
      { label: '利用規約', href: '/terms' },
      { label: '特定商取引法', href: '/tokushoho' },
      { label: 'お問い合わせ', href: '/contact' },
    ],
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cached queries — do not depend on request cookies
  const [rawListings, { count: activeCount }] = await Promise.all([
    getCachedFeaturedListings(),
    getCachedListingStats(),
  ]);

  // Fall back to demo data when Supabase has no listings
  const listings: ListingWithImages[] = rawListings.length > 0 ? rawListings : DEMO_LISTINGS.filter(l => l.status === 'active').slice(0, 8).map((l, i) => ({
    ...l,
    seller_id: `demo-seller-${i}`,
    status: l.status as import('@/lib/types').ListingStatus,
    description: null, vin: null, video_url: null, expires_at: null,
    listing_type: 'direct' as import('@/lib/types').ListingType, fee_rate: 3, ai_price_min: null, ai_price_max: null,
    view_count: 50 + i * 37, updated_at: l.created_at,
    listing_images: [],
    profiles: { id: `demo-seller-${i}`, display_name: '出品者', prefecture: l.prefecture, avatar_url: null },
  }));
  const displayCount = activeCount > 0 ? activeCount : 1284;

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
            description: '個人間で中古車を安心・直接売買できるC2Cマーケットプレイス',
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
        <section className="bg-gradient-to-b from-slate-50 to-white px-4 pb-14 pt-16 text-center">
          <p className="mb-3 inline-block rounded-full bg-accent-50 px-4 py-1 text-xs font-bold text-accent-600">
            買取保証つき 中古車ダイレクト販売
          </p>
          <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-5xl">
            業者なし。<span className="text-accent-600">個人どうし</span>で<br />
            中古車を安心・直接売買。
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 sm:text-base">
            エスクロー決済と名義変更代行で、個人間取引の不安をゼロに。
          </p>

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
        </section>

        {/* ── 2. 統計バー ── */}
        <section className="bg-navy-500 py-5 text-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-y-4 px-4 text-center sm:divide-x sm:divide-white/20">
            <div className="px-8">
              <p className="text-2xl font-black">
                {(displayCount ?? 0).toLocaleString()}
                <span className="ml-1 text-sm font-bold opacity-80">台</span>
              </p>
              <p className="mt-0.5 text-xs opacity-70">出品台数</p>
            </div>
            <div className="px-8">
              <p className="text-2xl font-black">
                3,847
                <span className="ml-1 text-sm font-bold opacity-80">件</span>
              </p>
              <p className="mt-0.5 text-xs opacity-70">累計成約件数</p>
            </div>
            <div className="px-8">
              <p className="text-2xl font-black">
                12
                <span className="ml-1 text-sm font-bold opacity-80">日</span>
              </p>
              <p className="mt-0.5 text-xs opacity-70">平均成約日数</p>
            </div>
            <div className="px-8">
              <p className="text-2xl font-black">
                28,400
                <span className="ml-1 text-sm font-bold opacity-80">人</span>
              </p>
              <p className="mt-0.5 text-xs opacity-70">会員数</p>
            </div>
          </div>
        </section>

        {/* ── 3. 車種から探す ── */}
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-5 text-xl font-black">車種から探す</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {BODY_TYPES.slice(0, 6).map((body) => (
                <Link
                  key={body}
                  href={`/listings?body=${encodeURIComponent(body)}`}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-accent-500 hover:bg-accent-50 hover:text-accent-600"
                >
                  <span className="text-2xl leading-none">{BODY_EMOJI[body] ?? '🚗'}</span>
                  {body}
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

        {/* ── 6. ユーザーの声 ── */}
        <section className="bg-white px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">
              Testimonials
            </p>
            <h2 className="mb-8 text-center text-2xl font-black">利用者の声</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {TESTIMONIALS.map(({ initial, avatarBg, name, role, rating, date, comment }) => (
                <div key={name} className="card flex flex-col p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${avatarBg}`}
                    >
                      {initial}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{name}</p>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{date}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{comment}</p>
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

              {/* Right: stats card */}
              <div className="card p-8">
                <div className="grid grid-cols-3">
                  <div className="border-r border-slate-100 pr-4 text-center">
                    <p className="text-2xl font-black text-navy-500">
                      42<span className="text-base font-bold">社</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">登録加盟店数</p>
                  </div>
                  <div className="border-r border-slate-100 px-4 text-center">
                    <p className="text-2xl font-black text-navy-500">
                      1,200<span className="text-base font-bold">台+</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">加盟店在庫</p>
                  </div>
                  <div className="pl-4 text-center">
                    <p className="text-2xl font-black text-accent-600">
                      2.5<span className="text-base font-bold">%〜</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">成約手数料</p>
                  </div>
                </div>
                <div className="mt-6 rounded-lg bg-slate-50 p-4">
                  <p className="text-center text-xs leading-relaxed text-slate-500">
                    個人間取引より優遇された手数料で在庫回転率を改善。<br />
                    APIで自動出品、ダッシュボードで成約・在庫を一元管理。
                  </p>
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
              <div className="card p-10 text-center text-sm text-slate-500">
                まだ出品がありません。最初の出品者になりましょう！
                <div className="mt-4">
                  <Link href="/sell" className="btn-accent">車を出品する</Link>
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
            <Link href="/sell" className="btn-accent px-7 py-3 text-base">
              無料で出品する
            </Link>
            <Link href="/listings" className="btn-outline px-7 py-3 text-base">
              車を探す
            </Link>
          </div>
        </section>

        {/* ── 10. フッター ── */}
        <footer className="bg-navy-700 px-4 py-14 text-navy-200">
          <div className="mx-auto max-w-5xl">
            {/* Logo + tagline */}
            <div className="mb-10 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-white">
                <Car className="h-6 w-6" />
                <span className="text-lg font-black tracking-tight">
                  BUYMO<span className="text-accent-500"> ダイレクト</span>
                </span>
              </div>
              <p className="text-sm">買取保証つき 中古車ダイレクト販売</p>
            </div>

            {/* 4-column link grid */}
            <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {FOOTER_LINKS.map(({ heading, links }) => (
                <div key={heading}>
                  <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white">
                    {heading}
                  </h4>
                  <ul className="space-y-2.5">
                    {links.map(({ label, href }) => (
                      <li key={label}>
                        <Link href={href} className="text-sm transition hover:text-white">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Copyright */}
            <div className="border-t border-white/10 pt-6 text-center text-xs text-navy-200">
              © 2026 BUYMO ダイレクト. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
