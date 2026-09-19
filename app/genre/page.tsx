import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Tag } from 'lucide-react';
import { GENRES, GENRE_CATEGORIES } from '@/lib/catalog';

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export const metadata: Metadata = {
  title: 'ジャンルから探す・売る｜中古車の買取・ダイレクト販売',
  description: '軽自動車・SUV・ミニバンから事故車・廃車・輸入車・旧車・パーツまで。ジャンル別に買取査定・ダイレクト販売。手数料0円・買取保証つき・エスクロー決済。',
  alternates: { canonical: `${BASE}/genre` },
};

export default function GenreHubPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 px-6 py-12 text-white">
        <p className="mb-2 flex items-center gap-1 text-sm font-bold text-green-100"><Tag className="h-4 w-4" />ジャンルから探す</p>
        <h1 className="text-3xl font-black sm:text-4xl">ジャンル別に、買取もダイレクト販売も</h1>
        <p className="mt-2 max-w-2xl text-green-50">
          人気車種・タイプ・お悩み（事故車／廃車など）・旧車・パーツまで。あなたの車にぴったりの入口から、無料査定・出品・購入ができます。
        </p>
      </section>

      {GENRE_CATEGORIES.map((cat) => {
        const items = GENRES.filter((g) => g.cat === cat.slug);
        if (items.length === 0) return null;
        return (
          <section key={cat.slug}>
            <h2 className="mb-4 text-lg font-black">{cat.label}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((g) => (
                <Link key={g.slug} href={`/genre/${g.slug}`} className="card group overflow-hidden transition hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image src={`/genre/${g.slug}.jpg`} alt={g.label} fill className="object-cover transition group-hover:scale-105" sizes="(max-width:640px) 50vw, 25vw" />
                    <span className="absolute left-2 top-2 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-black text-[#2E2408]">買取保証</span>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-navy-800">{g.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{g.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
