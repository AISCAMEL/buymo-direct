import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, ChevronRight } from 'lucide-react';
import { COLUMNS, COLUMN_CATEGORIES } from '@/lib/columns';
import { SITE_BASE, itemListJsonLd, breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 3600;

const BASE = SITE_BASE;

export const metadata: Metadata = {
  title: 'コラム｜車の買取・売却のお役立ち記事',
  description: '車買取相場の調べ方、事故車・不動車の売り方、名義変更、必要書類、高く売るタイミングなど、車の売却に役立つ記事をBUYMOが解説。',
  alternates: { canonical: `${BASE}/column` },
};

export default function ColumnHubPage() {
  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd([
              { name: 'ホーム', url: `${BASE}/` },
              { name: 'コラム', url: `${BASE}/column` },
            ]),
            itemListJsonLd('車の買取・売却コラム', COLUMNS.map((c) => `${BASE}/column/${c.slug}`)),
          ]),
        }}
      />

      <section className="rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-12 text-white">
        <p className="mb-2 flex items-center gap-1 text-sm font-bold text-mint-500"><BookOpen className="h-4 w-4" />コラム</p>
        <h1 className="text-3xl font-black sm:text-4xl">車の買取・売却お役立ちコラム</h1>
        <p className="mt-2 max-w-2xl text-white/80">相場の調べ方から書類・名義変更・タイミングまで。損しない車の売り方をやさしく解説します。</p>
      </section>

      {/* カテゴリから探す */}
      <section>
        <h2 className="mb-3 text-sm font-black text-slate-500">カテゴリから探す</h2>
        <div className="flex flex-wrap gap-2">
          {COLUMN_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/column/category/${encodeURIComponent(c)}`}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-accent-500 hover:text-accent-600"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {COLUMNS.map((c) => (
          <Link key={c.slug} href={`/column/${c.slug}`} className="card group flex flex-col p-5 transition hover:shadow-md">
            <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-600">{c.cat}</span>
            <h2 className="font-bold text-navy-800 group-hover:text-accent-600">{c.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.meta}</p>
            <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-bold text-accent-600">続きを読む <ChevronRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
