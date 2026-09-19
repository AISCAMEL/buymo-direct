import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ListingGrid } from '@/components/ListingGrid';
import { BODY_TYPES, MAKERS } from '@/lib/constants';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 3600;

type Params = Promise<{ body: string }>;

export async function generateStaticParams() {
  return BODY_TYPES.map((body) => ({ body: encodeURIComponent(body) }));
}

const BODY_IMG: Record<string, string> = {
  '軽自動車': '/cars/kei.jpg',
  'コンパクト': '/cars/compact.jpg',
  'セダン': '/cars/sedan.jpg',
  'SUV': '/cars/suv.jpg',
  'ミニバン': '/cars/minivan.jpg',
  'ワゴン': '/cars/subaru.jpg',
  'クーペ': '/cars/sedan.jpg',
  'オープン': '/cars/sedan.jpg',
  'その他': '/cars/sedan.jpg',
};

const BODY_DESC: Record<string, string> = {
  '軽自動車': '維持費が安く、街乗りに最適な軽自動車を個人間で売買。',
  'コンパクト': '燃費がよく扱いやすいコンパクトカーを個人間で直接取引。',
  'セダン': '落ち着いたスタイルのセダンを個人間で安く購入。',
  'SUV': '人気のSUVを個人間で直接売買。オフロードからシティユースまで。',
  'ミニバン': 'ファミリーに人気のミニバンを個人間で売買。',
  'ワゴン': '荷物もたっぷり積めるワゴンを個人間で直接取引。',
  'クーペ': 'スポーティなクーペを個人間で売買。',
  'オープン': '爽快なオープンカーを個人間で直接取引。',
  'その他': 'その他ボディタイプの中古車を個人間で売買。',
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { body: encodedBody } = await params;
  const body = decodeURIComponent(encodedBody);
  if (!BODY_TYPES.includes(body)) return { title: '見つかりません' };

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const desc = BODY_DESC[body] ?? `${body}の中古車を個人間で直接売買。`;
  return {
    title: `${body}の中古車`,
    description: `${desc}BUYMO ダイレクトで${body}の出品車両を探しましょう。手数料0円・エスクロー決済で安心。`,
    alternates: { canonical: `${BASE}/body/${encodedBody}` },
    openGraph: {
      title: `${body}の中古車 | BUYMO ダイレクト`,
      description: desc,
      url: `${BASE}/body/${encodedBody}`,
    },
  };
}

export default async function BodyTypePage({ params }: { params: Params }) {
  const { body: encodedBody } = await params;
  const body = decodeURIComponent(encodedBody);
  if (!BODY_TYPES.includes(body)) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, count } = await supabase
    .from('listings')
    .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url)', { count: 'exact' })
    .eq('status', 'active')
    .eq('body_type', body)
    .order('created_at', { ascending: false })
    .limit(12);

  const listings = (data ?? []) as unknown as ListingWithImages[];

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${body}の中古車`,
            description: BODY_DESC[body] ?? `${body}の中古車を個人間で直接売買`,
            url: `${BASE}/body/${encodedBody}`,
          }),
        }}
      />

      <div className="space-y-8">
        {/* ヘッダー */}
        <section className="relative overflow-hidden rounded-2xl">
          <Image src={BODY_IMG[body] ?? '/cars/sedan.jpg'} alt={body} fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 to-navy-700/55" />
          <div className="relative px-6 py-12 text-white">
            <span className="mb-2 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取保証つき</span>
            <h1 className="text-3xl font-black sm:text-4xl">{body} の中古車</h1>
            <p className="mt-2 text-white/85">{count ?? 0} 台出品中 · ダイレクト販売・買取 · 手数料0円</p>
            <p className="mt-1 text-sm text-white/70">{BODY_DESC[body]}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/listings?body=${encodeURIComponent(body)}`} className="inline-flex items-center gap-1 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold hover:bg-white/30 transition">
                すべての {body} を見る <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/listings/valuation" className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-[#2E2408] hover:bg-gold-600 transition">
                無料査定（買取）
              </Link>
            </div>
          </div>
        </section>

        {/* 人気メーカー × このボディタイプ */}
        <section>
          <h2 className="mb-3 text-lg font-black">メーカーで絞り込む</h2>
          <div className="flex flex-wrap gap-2">
            {Object.keys(MAKERS)
              .filter((m) => m !== 'その他')
              .slice(0, 10)
              .map((maker) => (
                <Link
                  key={maker}
                  href={`/listings?body=${encodeURIComponent(body)}&maker=${encodeURIComponent(maker)}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-navy-400 hover:text-navy-500"
                >
                  {maker}
                </Link>
              ))}
          </div>
        </section>

        {/* 出品一覧 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">
              新着 {body} の出品
              <span className="ml-2 text-sm font-bold text-slate-500">（{count ?? 0}台）</span>
            </h2>
            {(count ?? 0) > 12 && (
              <Link
                href={`/listings?body=${encodeURIComponent(body)}`}
                className="flex items-center gap-0.5 text-sm font-bold text-accent-600 hover:underline"
              >
                すべて見る <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {listings.length > 0 ? (
            <ListingGrid listings={listings} loggedIn={false} />
          ) : (
            <div className="card p-10 text-center text-sm text-slate-500">
              現在 {body} の出品はありません。
              <div className="mt-3">
                <Link href="/sell" className="btn-accent text-sm">
                  {body} を出品する
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 他のボディタイプ */}
        <section>
          <h2 className="mb-3 text-lg font-black">他の車種を見る</h2>
          <div className="flex flex-wrap gap-2">
            {BODY_TYPES.filter((b) => b !== body && b !== 'その他').map((b) => (
              <Link
                key={b}
                href={`/body/${encodeURIComponent(b)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-accent-500 hover:text-accent-600"
              >
                {b}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
