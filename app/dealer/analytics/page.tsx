import { TrendingUp, Package, ShieldCheck, Eye } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatYen } from '@/lib/format';
import KpiCard from '@/components/KpiCard';
import BarChart from '@/components/BarChart';

export const dynamic = 'force-dynamic';

function formatYenShort(v: number) {
  if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

export default async function DealerAnalyticsPage() {
  const { supabase, dealer } = await requireDealer() as any;
  const s = supabase as any;

  // 自店舗の listing_id 一覧
  const { data: myListings } = await s.from('listings')
    .select('id, title, maker, model, year, price, view_count, status, created_at')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });

  const listingIds = (myListings ?? []).map((l: any) => l.id);

  // 取引
  const { data: escrows } = listingIds.length > 0
    ? await s.from('escrow_transactions')
        .select('amount, escrow_fee, title_fee, installment_fee, coupon_discount, status, updated_at, listing_id')
        .in('listing_id', listingIds)
    : { data: [] };

  const completed = (escrows ?? []).filter((t: any) => t.status === 'completed');
  const gmv = completed.reduce((acc: number, t: any) => acc + t.amount, 0);
  const fees = completed.reduce((acc: number, t: any) => acc + (t.escrow_fee ?? 0) + (t.title_fee ?? 0), 0);

  const { data: dealerInfo } = await s.from('dealers').select('commission_rate').eq('id', dealer.dealerId).maybeSingle();
  const commission = gmv * ((dealerInfo?.commission_rate ?? 3) / 100);

  const allListings = myListings ?? [];
  const activeCount = allListings.filter((l: any) => l.status === 'active').length;
  const totalViews = allListings.reduce((acc: number, l: any) => acc + (l.view_count ?? 0), 0);
  const soldListings = allListings.filter((l: any) => l.status === 'sold');
  const inquiryRate = activeCount > 0 ? Math.round((soldListings.length / (soldListings.length + activeCount)) * 100) : 0;

  // 月次売上集計（直近6ヶ月）
  const now = new Date();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}月`,
    };
  });

  const monthlyMap: Record<string, number> = {};
  completed.forEach((t: any) => {
    const m = t.updated_at?.slice(0, 7) ?? '';
    monthlyMap[m] = (monthlyMap[m] ?? 0) + t.amount;
  });

  const monthlyData = last6Months.map(({ key, label }) => ({
    label,
    value: monthlyMap[key] ?? 0,
  }));

  const hasMonthlyData = monthlyData.some((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-navy-700">アナリティクス</h1>
        <p className="text-sm text-slate-400">店舗の販売実績と在庫パフォーマンス</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="累計 GMV"
          value={formatYen(gmv)}
          icon={TrendingUp}
          color="#1e3a5f"
        />
        <KpiCard
          title="手数料（推計）"
          value={formatYen(commission)}
          icon={TrendingUp}
          color="#0ea5e9"
        />
        <KpiCard
          title="成約件数"
          value={`${completed.length}件`}
          icon={ShieldCheck}
          color="#10b981"
        />
        <KpiCard
          title="総閲覧数"
          value={totalViews.toLocaleString('ja-JP')}
          icon={Eye}
          color="#8b5cf6"
        />
      </div>

      {/* Monthly chart */}
      <div className="card p-5">
        <h2 className="mb-4 font-bold text-slate-700">月次成約金額（直近6ヶ月）</h2>
        {hasMonthlyData ? (
          <BarChart
            data={monthlyData}
            height={220}
            color="#1e3a5f"
            formatValue={formatYenShort}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <div className="text-center">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">成約データがまだありません</p>
            </div>
          </div>
        )}
      </div>

      {/* Inventory stats summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5 text-center">
          <p className="text-3xl font-black text-navy-700">{activeCount}</p>
          <p className="mt-1 text-sm text-slate-500">公開中在庫</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-black text-emerald-600">{soldListings.length}</p>
          <p className="mt-1 text-sm text-slate-500">成約済み</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-black text-navy-400">{inquiryRate}%</p>
          <p className="mt-1 text-sm text-slate-500">成約率</p>
        </div>
      </div>

      {/* Inventory performance table */}
      <div className="card overflow-x-auto">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-bold text-slate-700">在庫パフォーマンス</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-bold">車両</th>
              <th className="px-4 py-3 text-right font-bold">価格</th>
              <th className="px-4 py-3 text-right font-bold">閲覧数</th>
              <th className="px-4 py-3 text-center font-bold">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allListings.slice(0, 20).map((l: any) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="max-w-48 truncate font-bold">{l.title}</p>
                  <p className="text-xs text-slate-400">{l.maker} {l.model} {l.year}年</p>
                </td>
                <td className="px-4 py-3 text-right font-bold">{formatYen(l.price)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{(l.view_count ?? 0).toLocaleString('ja-JP')}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${
                    l.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : l.status === 'sold'
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {({ active: '公開中', reserved: '商談中', sold: '売約済み', draft: '下書き', closed: '終了' } as Record<string, string>)[l.status] ?? l.status}
                  </span>
                </td>
              </tr>
            ))}
            {allListings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                  出品がまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
