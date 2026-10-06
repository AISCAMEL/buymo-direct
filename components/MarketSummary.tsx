import { TrendingUp, Calendar, Gauge, JapaneseYen, Layers } from 'lucide-react';

export type MarketStats = {
  count: number;
  sample: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  avgYear: number | null;
  avgMileage: number | null;
};

/** price 等の数値配列から相場サマリを計算（呼び出し側で price>0 のみ渡す想定）。 */
export function computeMarketStats(
  rows: { price: number | null; mileage_km: number | null; year: number | null }[],
  totalCount: number,
): MarketStats | null {
  const prices = rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (prices.length < 3) return null;
  const sum = prices.reduce((a, b) => a + b, 0);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);

  const years = rows.map((r) => Number(r.year)).filter((n) => Number.isFinite(n) && n > 1950);
  const kms = rows.map((r) => Number(r.mileage_km)).filter((n) => Number.isFinite(n) && n >= 0);

  return {
    count: totalCount,
    sample: prices.length,
    avgPrice: Math.round(sum / prices.length),
    medianPrice: median,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    avgYear: years.length ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null,
    avgMileage: kms.length ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : null,
  };
}

function man(yen: number): string {
  // 円 → 万円（小数1桁、整数なら小数省略）
  const m = yen / 10000;
  const s = m >= 100 ? Math.round(m).toLocaleString('ja-JP') : (Math.round(m * 10) / 10).toLocaleString('ja-JP');
  return `${s}万円`;
}

function Tile({ icon: Icon, label, value, sub }: { icon: typeof TrendingUp; label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
        <Icon className="h-3.5 w-3.5 text-teal-600" />
        {label}
      </span>
      <span className="text-base font-black tabular-nums text-navy-800">{value}</span>
      {sub && <span className="text-[11px] tabular-nums text-slate-400">{sub}</span>}
    </div>
  );
}

/** 検索結果の相場サマリ（現在の絞り込み条件に基づく目安）。 */
export function MarketSummary({ stats }: { stats: MarketStats }) {
  return (
    <div className="mb-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-3">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-black text-teal-700">
        <TrendingUp className="h-4 w-4" />
        この条件の相場（目安）
        <span className="font-bold text-slate-400">／ 掲載 {stats.count.toLocaleString('ja-JP')}台</span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile icon={JapaneseYen} label="平均価格" value={man(stats.avgPrice)} sub={`中央値 ${man(stats.medianPrice)}`} />
        <Tile icon={Layers} label="価格帯" value={man(stats.minPrice)} sub={`〜 ${man(stats.maxPrice)}`} />
        {stats.avgYear != null && <Tile icon={Calendar} label="平均年式" value={`${stats.avgYear}年`} />}
        {stats.avgMileage != null && (
          <Tile
            icon={Gauge}
            label="平均走行"
            value={stats.avgMileage >= 10000 ? `${(Math.round(stats.avgMileage / 1000) / 10).toLocaleString('ja-JP')}万km` : `${stats.avgMileage.toLocaleString('ja-JP')}km`}
          />
        )}
      </div>
    </div>
  );
}
