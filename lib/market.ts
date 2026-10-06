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

/** price 等の数値配列から相場サマリを計算（3件未満は null）。 */
export function computeMarketStats(
  rows: { price: number | null; mileage_km: number | null; year: number | null }[],
  totalCount: number,
): MarketStats | null {
  const prices = rows
    .map((r) => Number(r.price))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
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
