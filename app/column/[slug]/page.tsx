import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { COLUMNS, COLUMN_BY_SLUG } from '@/lib/columns';

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return COLUMNS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = COLUMN_BY_SLUG[slug];
  if (!c) return { title: '見つかりません' };
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  return {
    title: c.title,
    description: c.meta,
    alternates: { canonical: `${BASE}/column/${slug}` },
    openGraph: { title: c.title, description: c.meta, url: `${BASE}/column/${slug}`, type: 'article' },
  };
}

export default async function ColumnArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const c = COLUMN_BY_SLUG[slug];
  if (!c) notFound();

  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
  const others = COLUMNS.filter((x) => x.slug !== slug).slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: c.title,
            description: c.meta,
            articleSection: c.cat,
            url: `${BASE}/column/${slug}`,
            publisher: { '@type': 'Organization', name: 'BUYMO ダイレクト' },
          }),
        }}
      />
      <article className="mx-auto max-w-3xl">
        <nav className="mb-4 text-xs text-slate-400">
          <Link href="/column" className="hover:underline">コラム</Link> › {c.cat}
        </nav>
        <span className="mb-2 inline-flex items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-600">{c.cat}</span>
        <h1 className="text-2xl font-black leading-snug text-navy-900 sm:text-3xl">{c.title}</h1>

        <div className="column-body mt-6" dangerouslySetInnerHTML={{ __html: c.html }} />

        {/* CTA */}
        <div className="mt-8 rounded-2xl bg-navy-50 p-6 text-center">
          <p className="font-black text-navy-800">まずは無料査定から</p>
          <p className="mt-1 text-sm text-slate-600">写真を送るだけ。手数料0円・買取保証つき・エスクロー決済で安心。</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/listings/valuation" className="btn-gold">無料査定を申し込む</Link>
            <Link href="/sell" className="btn-outline">クルマを出品する</Link>
          </div>
        </div>

        {/* 他の記事 */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-black">ほかのコラム</h2>
          <ul className="space-y-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/column/${o.slug}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-navy-700 transition hover:border-accent-400 hover:text-accent-600">
                  <span className="line-clamp-1">{o.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </>
  );
}
