import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { MapPin, ChevronRight } from 'lucide-react';
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
    <div className="space-y-10">
      {/* ヒーロー */}
      <section className="relative overflow-hidden rounded-2xl">
        <Image src="/area/tokyo.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 to-navy-700/60" />
        <div className="relative px-6 py-12 text-white">
          <p className="mb-2 flex items-center gap-1 text-sm font-bold text-accent-200"><MapPin className="h-4 w-4" />エリアから探す</p>
          <h1 className="text-3xl font-black sm:text-4xl">全国47都道府県から探す・売る</h1>
          <p className="mt-2 max-w-xl text-white/85">お住まいの地域の出品車両・買取査定をチェック。全国どこでもオンライン完結・買取保証つき。</p>
        </div>
      </section>

      {AREA_REGIONS.map((region) => {
        const areas = AREAS.filter((a) => a.region === region);
        if (areas.length === 0) return null;
        return (
          <section key={region}>
            <h2 className="mb-3 text-lg font-black">{region}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {areas.map((a) => (
                <Link
                  key={a.slug}
                  href={`/area/${a.slug}`}
                  className="group relative overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={`/area/${a.slug}.jpg`}
                      alt={`${a.name}の中古車・買取`}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2">
                      <span className="font-black text-white drop-shadow">{a.name}</span>
                      <ChevronRight className="h-4 w-4 text-white/90 transition group-hover:translate-x-0.5" />
                    </div>
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
