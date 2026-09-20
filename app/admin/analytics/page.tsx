import { TrendingUp, Users, ShoppingCart, Wallet, Banknote, ShieldCheck } from 'lucide-react';
import KpiCard from '@/components/KpiCard';
import BarChart from '@/components/BarChart';
import LineChart from '@/components/LineChart';
import RevenueTable, { type RevenueRow } from '@/components/RevenueTable';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function formatYenShort(v: number) {
  if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

type Month = { y: number; m: number; label: string; end: Date };
function lastMonths(n: number): Month[] {
  const now = new Date();
  const out: Month[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      y: d.getFullYear(),
      m: d.getMonth(),
      label: `${d.getMonth() + 1}月`,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }
  return out;
}
function inMonth(dateStr: string | null, mo: Month): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === mo.y && d.getMonth() === mo.m;
}
function mom(series: { value: number }[]): number | undefined {
  if (series.length < 2) return undefined;
  const prev = series[series.length - 2].value;
  const cur = series[series.length - 1].value;
  if (!prev) return undefined;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

type Escrow = { status: string; amount: number | null; escrow_fee: number | null; title_fee: number | null; installment_fee: number | null; created_at: string | null };
type Buyback = { status: string; buyback_price: number | null; created_at: string | null };
type Dealer = { id: string; name: string | null; company_name: string | null; status: string };
type Listing = { dealer_id: string | null; status: string; price: number | null };

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  let escrows: Escrow[] = [];
  let profiles: { created_at: string | null }[] = [];
  let buybacks: Buyback[] = [];
  let dealers: Dealer[] = [];
  let listings: Listing[] = [];
  try {
    const s = createServiceClient();
    const [e, p, b, d, l] = await Promise.all([
      s.from('escrow_transactions').select('status, amount, escrow_fee, title_fee, installment_fee, created_at'),
      s.from('profiles').select('created_at'),
      s.from('buyback_requests').select('status, buyback_price, created_at'),
      s.from('dealers').select('id, name, company_name, status'),
      s.from('listings').select('dealer_id, status, price'),
    ]);
    escrows = (e.data ?? []) as Escrow[];
    profiles = (p.data ?? []) as { created_at: string | null }[];
    buybacks = (b.data ?? []) as Buyback[];
    dealers = (d.data ?? []) as Dealer[];
    listings = (l.data ?? []) as Listing[];
  } catch {
    /* データ取得不可時は空集計で描画 */
  }

  const months = lastMonths(6);
  const completed = escrows.filter((e) => e.status === 'completed');

  // 月次GMV・合計
  const gmvMonthly = months.map((mo) => ({
    label: mo.label,
    value: completed.filter((e) => inMonth(e.created_at, mo)).reduce((s, e) => s + (e.amount ?? 0), 0),
  }));
  const totalGmv6 = gmvMonthly.reduce((s, d) => s + d.value, 0);
  const dealCount = completed.length;
  const feeRevenue = completed.reduce(
    (s, e) => s + (e.escrow_fee ?? 0) + (e.title_fee ?? 0) + (e.installment_fee ?? 0),
    0,
  );

  // 会員数（累積推移）
  const memberGrowth = months.map((mo) => ({
    label: mo.label,
    value: profiles.filter((p) => p.created_at && new Date(p.created_at) < mo.end).length,
  }));
  const totalMembers = profiles.length;

  // 買取事業
  const bbCompleted = buybacks.filter((b) => b.status === 'completed');
  const buybackMonthly = months.map((mo) => ({
    label: mo.label,
    value: bbCompleted.filter((b) => inMonth(b.created_at, mo)).reduce((s, b) => s + (b.buyback_price ?? 0), 0),
  }));
  const buybackTotal6 = buybackMonthly.reduce((s, d) => s + d.value, 0);
  const buybackCount = bbCompleted.length;
  const buybackAvg = buybackCount
    ? Math.round(bbCompleted.reduce((s, b) => s + (b.buyback_price ?? 0), 0) / buybackCount)
    : 0;
  const buybackShare = totalGmv6 + buybackTotal6 > 0 ? Math.round((buybackTotal6 / (totalGmv6 + buybackTotal6)) * 100) : 0;

  // トップディーラー（実データ）
  const topDealers: RevenueRow[] = dealers
    .map((d) => {
      const dl = listings.filter((l) => l.dealer_id === d.id);
      const sold = dl.filter((l) => l.status === 'sold');
      const gmv = sold.reduce((s, l) => s + (l.price ?? 0), 0);
      return { name: d.company_name || d.name || '（無名）', listings: dl.length, sold: sold.length, gmv, commission: Math.round(gmv * 0.03) };
    })
    .filter((r) => r.listings > 0)
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 10);

  const commissionsTotal = Math.round(totalGmv6 * 0.025);
  const hasData = dealCount > 0 || totalMembers > 0 || buybackCount > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-navy-700">アナリティクス</h1>
        <p className="text-sm text-slate-400">過去6ヶ月のプラットフォーム実績（ダイレクト販売＋買取／実データ集計）</p>
      </div>

      {!hasData && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          集計対象の成約・会員データがまだありません。取引・会員が増えると、ここに実数が反映されます。
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="成約GMV（6ヶ月）" value={formatYenShort(totalGmv6)} change={mom(gmvMonthly)} icon={TrendingUp} color="#0F766E" />
        <KpiCard title="成約件数（累計）" value={`${dealCount.toLocaleString('ja-JP')}件`} icon={ShoppingCart} color="#D4AF65" />
        <KpiCard title="登録会員（累計）" value={`${totalMembers.toLocaleString('ja-JP')}名`} change={mom(memberGrowth)} icon={Users} color="#0C3A44" />
        <KpiCard title="手数料収入（成約）" value={formatYenShort(feeRevenue)} icon={Wallet} color="#14B8A6" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-slate-700">月次成約GMV（直近6ヶ月）</h2>
          <BarChart data={gmvMonthly} height={220} color="#0F766E" formatValue={formatYenShort} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-slate-700">会員数推移</h2>
          <LineChart data={memberGrowth} height={220} color="#D4AF65" formatValue={(v) => `${v.toLocaleString('ja-JP')}名`} />
        </div>
      </div>

      {/* 買取事業 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-gold-100 p-1.5"><Banknote className="h-4 w-4 text-gold-600" /></span>
          <h2 className="font-black text-navy-700">買取事業（買取保証・BUYMO買取）</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="買取GMV（6ヶ月）" value={formatYenShort(buybackTotal6)} change={mom(buybackMonthly)} icon={Banknote} color="#D4AF65" />
          <KpiCard title="買取成約件数" value={`${buybackCount.toLocaleString('ja-JP')}件`} icon={ShieldCheck} color="#0F766E" />
          <KpiCard title="平均買取単価" value={formatYenShort(buybackAvg)} icon={Wallet} color="#0C3A44" />
          <KpiCard title="流通額に占める買取比率" value={`${buybackShare}%`} icon={TrendingUp} color="#14B8A6" />
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-slate-700">月次 買取GMV（直近6ヶ月）</h3>
          <BarChart data={buybackMonthly} height={200} color="#D4AF65" formatValue={formatYenShort} />
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="card p-5">
        <h2 className="mb-4 font-bold text-slate-700">月次詳細</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">月</th>
                <th className="px-4 py-3 text-right font-bold">成約GMV</th>
                <th className="px-4 py-3 text-right font-bold">買取GMV</th>
                <th className="px-4 py-3 text-right font-bold">会員数(累計)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((mo, i) => (
                <tr key={mo.label} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{mo.label}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatYenShort(gmvMonthly[i].value)}</td>
                  <td className="px-4 py-3 text-right text-gold-600 font-bold">{formatYenShort(buybackMonthly[i].value)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{memberGrowth[i].value.toLocaleString('ja-JP')}</td>
                </tr>
              ))}
              <tr className="bg-navy-50 font-bold">
                <td className="px-4 py-3 text-navy-700">合計/最新</td>
                <td className="px-4 py-3 text-right text-navy-700">{formatYenShort(totalGmv6)}</td>
                <td className="px-4 py-3 text-right text-navy-700">{formatYenShort(buybackTotal6)}</td>
                <td className="px-4 py-3 text-right text-navy-700">{totalMembers.toLocaleString('ja-JP')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">推計手数料（成約GMVの約2.5%）: {formatYenShort(commissionsTotal)}</p>
      </div>

      {/* Top dealers */}
      <div>
        <h2 className="mb-3 font-bold text-slate-700">トップ10ディーラー（GMV順）</h2>
        {topDealers.length > 0 ? (
          <RevenueTable rows={topDealers} />
        ) : (
          <div className="card p-8 text-center text-sm text-slate-400">売上のある加盟店データがまだありません。</div>
        )}
      </div>
    </div>
  );
}
