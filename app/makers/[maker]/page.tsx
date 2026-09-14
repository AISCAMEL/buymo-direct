import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ListingGrid } from '@/components/ListingGrid';
import { MAKERS } from '@/lib/constants';
import type { ListingWithImages } from '@/lib/types';

export const revalidate = 3600;

type Params = Promise<{ maker: string }>;

export async function generateStaticParams() {
  return Object.keys(MAKERS).map((maker) => ({ maker: encodeURIComponent(maker) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { maker: encodedMaker } = await params;
  const maker = decodeURIComponent(encodedMaker);
  if (!MAKERS[maker]) return { title: '見つかりません' };

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  return {
    title: `${maker}の中古車`,
    description: `${maker}の中古車を個人間で直接売買。BUYMO C2Cで${maker}の出品車両を探しましょう。手数料0円・エスクロー決済で安心。`,
    alternates: { canonical: `${BASE}/makers/${encodedMaker}` },
    openGraph: {
      title: `${maker}の中古車 | BUYMO C2C`,
      description: `${maker}の中古車を個人間で直接売買。`,
      url: `${BASE}/makers/${encodedMaker}`,
    },
  };
}

export default async function MakerPage({ params }: { params: Params }) {
  const { maker: encodedMaker } = await params;
  const maker = decodeURIComponent(encodedMaker);
  if (!MAKERS[maker]) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data, count }] = await Promise.all([
    supabase
      .from('listings')
      .select('*, listing_images(*), profiles(id, display_name, prefecture, avatar_url)', { count: 'exact' })
      .eq('status', 'active')
      .eq('maker', maker)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const listings = (data ?? []) as unknown as ListingWithImages[];
  const models = MAKERS[maker] ?? [];

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${maker}の中古車`,
            description: `${maker}の中古車を個人間で直接売買`,
            url: `${BASE}/makers/${encodedMaker}`,
          }),
        }}
      />

      <div className="space-y-8">
        {/* ヘッダー */}
        <section className="rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-12 text-white">
          <p className="mb-2 text-sm font-bold text-navy-200">メーカーで探す</p>
          <h1 className="text-3xl font-black sm:text-4xl">{maker} の中古車</h1>
          <p className="mt-2 text-navy-100">
            {count ?? 0} 台出品中 · 個人間直接取引 · 手数料0円
          </p>
          <Link
            href={`/listings?maker=${encodeURIComponent(maker)}`}
            className="mt-5 inline-flex items-center gap-1 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold hover:bg-white/30 transition"
          >
            すべての {maker} を見る <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        {/* モデル一覧 */}
        {models.length > 1 && (
          <section>
            <h2 className="mb-3 text-lg font-black">モデルから探す</h2>
            <div className="flex flex-wrap gap-2">
              {models.filter((m) => m !== 'その他').map((model) => (
                <Link
                  key={model}
                  href={`/listings?maker=${encodeURIComponent(maker)}&model=${encodeURIComponent(model)}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-accent-500 hover:text-accent-600"
                >
                  {model}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 出品一覧 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">
              新着 {maker} の出品
              <span className="ml-2 text-sm font-bold text-slate-500">（{count ?? 0}台）</span>
            </h2>
            {(count ?? 0) > 12 && (
              <Link
                href={`/listings?maker=${encodeURIComponent(maker)}`}
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
              現在 {maker} の出品はありません。
              <div className="mt-3">
                <Link href="/sell" className="btn-accent text-sm">
                  {maker} を出品する
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 関連メーカー */}
        <section>
          <h2 className="mb-3 text-lg font-black">他のメーカーを見る</h2>
          <div className="flex flex-wrap gap-2">
            {Object.keys(MAKERS)
              .filter((m) => m !== maker && m !== 'その他')
              .slice(0, 8)
              .map((m) => (
                <Link
                  key={m}
                  href={`/makers/${encodeURIComponent(m)}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-accent-500 hover:text-accent-600"
                >
                  {m}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}
