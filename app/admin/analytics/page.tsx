import { TrendingUp, Users, ShoppingCart, Wallet } from 'lucide-react';
import KpiCard from '@/components/KpiCard';
import BarChart from '@/components/BarChart';
import LineChart from '@/components/LineChart';
import RevenueTable, { type RevenueRow } from '@/components/RevenueTable';

export const dynamic = 'force-dynamic';

// ─── Mock data (replace with real DB queries when ready) ─────────────────────

const GMV_MONTHLY = [
  { label: '1月', value: 32_400_000 },
  { label: '2月', value: 28_750_000 },
  { label: '3月', value: 41_200_000 },
  { label: '4月', value: 38_600_000 },
  { label: '5月', value: 45_800_000 },
  { label: '6月', value: 61_250_000 },
];

const USER_GROWTH = [
  { label: '1月', value: 18_200 },
  { label: '2月', value: 20_400 },
  { label: '3月', value: 22_100 },
  { label: '4月', value: 24_300 },
  { label: '5月', value: 26_500 },
  { label: '6月', value: 28_400 },
];

const TOP_DEALERS: RevenueRow[] = [
  { name: 'トヨタカローラ東京', listings: 142, sold: 89, gmv: 267_000_000, commission: 8_010_000 },
  { name: 'ホンダカーズ神奈川', listings: 118, sold: 74, gmv: 222_000_000, commission: 6_660_000 },
  { name: 'ネッツトヨタ大阪', listings: 103, sold: 68, gmv: 204_000_000, commission: 6_120_000 },
  { name: 'スバルXVプレミアム', listings: 96, sold: 61, gmv: 183_000_000, commission: 5_490_000 },
  { name: 'マツダオートザム愛知', listings: 87, sold: 55, gmv: 165_000_000, commission: 4_950_000 },
  { name: 'ダイハツ九州', listings: 79, sold: 48, gmv: 144_000_000, commission: 4_320_000 },
  { name: 'スズキアリーナ北海道', listings: 72, sold: 43, gmv: 129_000_000, commission: 3_870_000 },
  { name: 'BMW正規代理店横浜', listings: 64, sold: 38, gmv: 114_000_000, commission: 3_420_000 },
  { name: 'メルセデス大宮', listings: 58, sold: 34, gmv: 102_000_000, commission: 3_060_000 },
  { name: 'レクサス渋谷', listings: 51, sold: 29, gmv: 87_000_000, commission: 2_610_000 },
];

function formatYenShort(v: number) {
  if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const totalGmv = GMV_MONTHLY.reduce((s, d) => s + d.value, 0);
  const commissionsTotal = Math.round(totalGmv * 0.025);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-navy-700">アナリティクス</h1>
        <p className="text-sm text-slate-400">過去6ヶ月のプラットフォーム実績（モックデータ）</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="総GMV（6ヶ月）"
          value="¥248M"
          change={18.4}
          icon={TrendingUp}
          color="#1e3a5f"
        />
        <KpiCard
          title="成約件数"
          value="3,847件"
          change={12.1}
          icon={ShoppingCart}
          color="#0ea5e9"
        />
        <KpiCard
          title="新規会員"
          value="28,400名"
          change={9.7}
          icon={Users}
          color="#8b5cf6"
        />
        <KpiCard
          title="手数料収入"
          value="¥6.2M"
          change={-3.2}
          icon={Wallet}
          color="#f59e0b"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-slate-700">月次成約GMV（直近6ヶ月）</h2>
          <BarChart
            data={GMV_MONTHLY}
            height={220}
            color="#1e3a5f"
            formatValue={formatYenShort}
          />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-bold text-slate-700">会員数推移</h2>
          <LineChart
            data={USER_GROWTH}
            height={220}
            color="#8b5cf6"
            formatValue={(v) => `${(v / 10000).toFixed(1)}万人`}
          />
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
                <th className="px-4 py-3 text-right font-bold">GMV</th>
                <th className="px-4 py-3 text-right font-bold">推計手数料</th>
                <th className="px-4 py-3 text-right font-bold">新規会員</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {GMV_MONTHLY.map((row, i) => {
                const userRow = USER_GROWTH[i];
                const prevUsers = i > 0 ? USER_GROWTH[i - 1].value : userRow.value;
                const newUsers = userRow.value - prevUsers;
                return (
                  <tr key={row.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{row.label}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatYenShort(row.value)}</td>
                    <td className="px-4 py-3 text-right text-navy-700 font-bold">
                      {formatYenShort(Math.round(row.value * 0.025))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      +{(i === 0 ? newUsers + 2_000 : newUsers).toLocaleString('ja-JP')}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-navy-50 font-bold">
                <td className="px-4 py-3 text-navy-700">合計</td>
                <td className="px-4 py-3 text-right text-navy-700">{formatYenShort(totalGmv)}</td>
                <td className="px-4 py-3 text-right text-navy-700">{formatYenShort(commissionsTotal)}</td>
                <td className="px-4 py-3 text-right text-navy-700">
                  +{(USER_GROWTH[USER_GROWTH.length - 1].value - USER_GROWTH[0].value + 2_200).toLocaleString('ja-JP')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top dealers */}
      <div>
        <h2 className="mb-3 font-bold text-slate-700">トップ10ディーラー（GMV順）</h2>
        <RevenueTable rows={TOP_DEALERS} />
      </div>
    </div>
  );
}
