// オークション決算書の計算とラベル。クライアント/サーバー両用（副作用なし）。

export const AUCTION_STATUS_LABEL: Record<string, string> = {
  listed: '出品中',
  sold: '落札',
  unsold: '不落',
  cancelled: '取消',
  settled: '決算済み',
};

export const AUCTION_STATUS_CLS: Record<string, string> = {
  listed: 'bg-blue-100 text-blue-700',
  sold: 'bg-emerald-100 text-emerald-700',
  unsold: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
  settled: 'bg-teal-100 text-teal-700',
};

/**
 * 決算書の計算。
 * 利益 = 落札額 − 仕入れ原価 − 諸経費
 * 成約手数料 = max(0, 利益) × 率（利益が出たときだけ）
 * 本部への支払い = 出品料 + 成約手数料
 */
export function computeSettlement(input: {
  salePrice: number;
  purchaseCost: number;
  expenses: number;
  listingFee: number;
  rate: number;
}): { profit: number; commission: number; totalDue: number } {
  const sale = Math.max(0, Math.round(input.salePrice || 0));
  const cost = Math.max(0, Math.round(input.purchaseCost || 0));
  const exp = Math.max(0, Math.round(input.expenses || 0));
  const listingFee = Math.max(0, Math.round(input.listingFee || 0));
  const rate = input.rate >= 0 && input.rate <= 1 ? input.rate : 0.03;
  const profit = sale - cost - exp;
  const commission = Math.round(Math.max(0, profit) * rate);
  return { profit, commission, totalDue: listingFee + commission };
}
