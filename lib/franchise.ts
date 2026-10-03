// 買取加盟（フランチャイズ）申込の計算とラベル。クライアント/サーバー両用（副作用なし）。

export type FranchisePaymentMethod = 'invoice' | 'card';

export const PAYMENT_METHOD_LABEL: Record<FranchisePaymentMethod, string> = {
  invoice: '単発請求（銀行振込）',
  card: 'クレジットカード（Square）',
};

export const FRANCHISE_STATUS_LABEL: Record<string, string> = {
  pending: '受付',
  invoiced: '請求済み',
  paid: '入金確認',
  approved: '加盟完了',
  rejected: '見送り',
  cancelled: 'キャンセル',
};

export const FRANCHISE_STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  invoiced: 'bg-blue-100 text-blue-700',
  paid: 'bg-teal-100 text-teal-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
};

/** 加盟金の内訳を計算。カード決済のときだけ上乗せ（surcharge）を加算。 */
export function computeFranchiseFee(
  joiningFee: number,
  surchargeRate: number,
  method: FranchisePaymentMethod
): { joiningFee: number; surcharge: number; total: number } {
  const base = Math.max(0, Math.round(joiningFee));
  const surcharge = method === 'card' ? Math.round(base * (surchargeRate || 0)) : 0;
  return { joiningFee: base, surcharge, total: base + surcharge };
}
