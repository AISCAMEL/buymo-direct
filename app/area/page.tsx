import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { AREAS, AREA_REGIONS } from '@/lib/catalog';

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export const metadata: Metadata = {
  title: 'エリアから中古車を探す・売る（全国47都道府県）',
  description: '全国47都道府県から中古車を探す・売る。BUYMO ダイレクトは買取保証つき・手数料0円・エスクロー決済で、どの地域でもオンライン完結。',
  alternates: { canonical: `${BASE}/area` },
};

export default function AreaIndexPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-12 text-white">
        <p className="mb-2 flex items-center gap-1 text-sm font-bold text-mint-500"><MapPin className="h-4 w-4" />エリアから探す</p>
        <h1 className="text-3xl font-black sm:text-4xl">全国47都道府県から探す・売る</h1>
        <p className="mt-2 text-white/80">お住まいの地域の出品車両・買取査定をチェック。全国どこでもオンライン完結・買取保証つき。</p>
      </section>

      {AREA_REGIONS.map((region) => (
        <section key={region}>
          <h2 className="mb-3 text-lg font-black">{region}</h2>
          <div className="flex flex-wrap gap-2">
            {AREAS.filter((a) => a.region === region).map((a) => (
              <Link key={a.slug} href={`/area/${a.slug}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-accent-500 hover:text-accent-600">
                {a.name}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
