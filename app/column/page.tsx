import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { COLUMNS } from '@/lib/columns';

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export const metadata: Metadata = {
  title: 'コラム｜車の買取・売却のお役立ち記事',
  description: '車買取相場の調べ方、事故車・不動車の売り方、必要書類、高く売るタイミングなど、車の売却に役立つ記事をBUYMOが解説。',
  alternates: { canonical: `${BASE}/column` },
};

export default function ColumnHubPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-12 text-white">
        <p className="mb-2 flex items-center gap-1 text-sm font-bold text-mint-500"><BookOpen className="h-4 w-4" />コラム</p>
        <h1 className="text-3xl font-black sm:text-4xl">車の買取・売却お役立ちコラム</h1>
        <p className="mt-2 max-w-2xl text-white/80">相場の調べ方から書類・タイミングまで。損しない車の売り方をやさしく解説します。</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {COLUMNS.map((c) => (
          <Link key={c.slug} href={`/column/${c.slug}`} className="card group flex flex-col p-5 transition hover:shadow-md">
            <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-600">{c.cat}</span>
            <h2 className="font-bold text-navy-800 group-hover:text-accent-600">{c.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.meta}</p>
            <span className="mt-3 text-sm font-bold text-accent-600">続きを読む →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
