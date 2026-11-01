import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BookOpen, ChevronRight } from 'lucide-react';
import { COLUMNS, COLUMN_CATEGORIES, columnThumb } from '@/lib/columns';
import { loadDbColumns } from '@/lib/columns-db';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SITE_BASE, itemListJsonLd } from '@/lib/seo';

export const revalidate = 600;
export const dynamicParams = true;

type Params = Promise<{ cat: string }>;
type Card = { slug: string; title: string; meta: string; cat: string; thumb: string };

export function generateStaticParams() {
  return COLUMN_CATEGORIES.map((cat) => ({ cat: encodeURIComponent(cat) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cat: enc } = await params;
  const cat = decodeURIComponent(enc);
  return {
    title: `${cat}のコラム一覧｜車の買取・売却`,
    description: `「${cat}」に関する車の買取・売却お役立ち記事の一覧。BUYMO ダイレクトがやさしく解説します。`,
    alternates: { canonical: `${SITE_BASE}/column/category/${enc}` },
  };
}

export default async function ColumnCategoryPage({ params }: { params: Params }) {
  const { cat: enc } = await params;
  const cat = decodeURIComponent(enc);

  const dbCols = await loadDbColumns();
  const items: Card[] = [
    ...dbCols.filter((c) => c.cat === cat).map((c) => ({ slug: c.slug, title: c.title, meta: c.meta, cat: c.cat, thumb: c.thumb_url || columnThumb(c.cat) })),
    ...COLUMNS.filter((c) => c.cat === cat).map((c) => ({ slug: c.slug, title: c.title, meta: c.meta, cat: c.cat, thumb: columnThumb(c.cat) })),
  ];
  if (items.length === 0) notFound();
  const categories = Array.from(new Set([...COLUMN_CATEGORIES, ...dbCols.map((c) => c.cat)]));

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(`${cat}のコラム`, items.map((c) => `${SITE_BASE}/column/${c.slug}`)),
            ),
          }}
        />
      )}

      <Breadcrumbs
        items={[
          { name: 'ホーム', url: `${SITE_BASE}/` },
          { name: 'コラム', url: `${SITE_BASE}/column` },
          { name: cat, url: `${SITE_BASE}/column/category/${enc}` },
        ]}
      />

      <div>
        <p className="mb-1 flex items-center gap-1 text-xs font-black uppercase tracking-widest text-accent-600">
          <BookOpen className="h-4 w-4" />category
        </p>
        <h1 className="text-2xl font-black sm:text-3xl">「{cat}」のコラム</h1>
        <p className="mt-1 text-sm text-slate-500">{items.length}件の記事</p>
      </div>

      {/* 他カテゴリ */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c}
            href={`/column/category/${encodeURIComponent(c)}`}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
              c === cat
                ? 'border-accent-500 bg-accent-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-accent-300 hover:text-accent-600'
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <Link key={c.slug} href={`/column/${c.slug}`} className="card group flex flex-col overflow-hidden transition hover:shadow-md">
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
              <Image src={c.thumb} alt="" fill sizes="(max-width:640px) 100vw, 50vw" className="object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-accent-600 shadow-sm">{c.cat}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="font-bold text-navy-800 group-hover:text-accent-600">{c.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.meta}</p>
              <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-bold text-accent-600">続きを読む <ChevronRight className="h-4 w-4" /></span>
            </div>
          </Link>
        ))}
      </div>

      <Link href="/column" className="inline-flex items-center gap-1 text-sm font-bold text-navy-500 hover:underline">
        ← コラム一覧に戻る
      </Link>
    </div>
  );
}
