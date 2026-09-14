import Link from 'next/link';
import { Building2, MapPin, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: '加盟店一覧 | BUYMO' };

export default async function DealersPage({
  searchParams,
}: {
  searchParams: Promise<{ prefecture?: string }>;
}) {
  const { prefecture } = await searchParams;
  const supabase = await createClient();
  const s = supabase as any;

  let query = s
    .from('dealers')
    .select('id, name, company_name, prefecture, description, logo_url')
    .eq('status', 'approved')
    .order('name', { ascending: true });

  if (prefecture) query = query.eq('prefecture', prefecture);

  const { data: dealers } = await query;

  // listing counts per dealer
  const { data: counts } = await s
    .from('listings')
    .select('dealer_id')
    .eq('status', 'active')
    .in('dealer_id', (dealers ?? []).map((d: any) => d.id));

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.dealer_id] = (countMap[row.dealer_id] ?? 0) + 1;
  }

  // prefecture options
  const prefectureList = Array.from(new Set((dealers ?? []).map((d: any) => d.prefecture).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-navy-500" />
        <div>
          <h1 className="text-2xl font-black">認定加盟店一覧</h1>
          <p className="text-sm text-slate-500">BUYMO 認定の販売店から安心して購入できます</p>
        </div>
      </div>

      {/* Prefecture filter */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/dealers"
          className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${!prefecture ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          すべて
        </a>
        {prefectureList.map((p) => (
          <a
            key={p}
            href={`/dealers?prefecture=${encodeURIComponent(p)}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${prefecture === p ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {p}
          </a>
        ))}
      </div>

      {(!dealers || dealers.length === 0) && (
        <p className="py-16 text-center text-slate-400">現在登録されている加盟店はありません</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(dealers ?? []).map((d: any) => (
          <Link
            key={d.id}
            href={`/dealers/${d.id}`}
            className="card flex flex-col gap-3 p-5 transition hover:shadow-md"
          >
            {d.logo_url ? (
              <img src={d.logo_url} alt={d.name} className="h-14 w-auto object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-100">
                <Building2 className="h-7 w-7 text-navy-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-black text-navy-800">{d.name}</h2>
              {d.company_name && <p className="text-sm text-slate-500">{d.company_name}</p>}
              {d.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{d.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              {d.prefecture && (
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {d.prefecture}
                </span>
              )}
              <span className="flex items-center gap-1 font-bold text-navy-600">
                <Package className="h-3.5 w-3.5" />
                {countMap[d.id] ?? 0}台
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
