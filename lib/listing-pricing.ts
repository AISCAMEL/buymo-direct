// ダイレクト販売（加盟店）の価格内訳・支払総額の計算。

export type PriceBreakdown = {
  price?: number | null;            // 車両本体価格
  registration_fee?: number | null; // 登録費用
  recycle_fee?: number | null;      // リサイクル料金
  warranty_fee?: number | null;     // 保証料
  delivery_fee?: number | null;     // 納車費用
  misc_fees?: number | null;        // 諸費用
  tax_amount?: number | null;       // 消費税（表示用）
};

const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** 支払総額 = 車両本体 + 各諸費用（税は内訳に含む前提で二重計上しない）。 */
export function totalPayment(b: PriceBreakdown): number {
  return n(b.price) + n(b.registration_fee) + n(b.recycle_fee) + n(b.warranty_fee) + n(b.delivery_fee) + n(b.misc_fees);
}

/** 諸費用の合計（本体を除く）。 */
export function feesSubtotal(b: PriceBreakdown): number {
  return n(b.registration_fee) + n(b.recycle_fee) + n(b.warranty_fee) + n(b.delivery_fee) + n(b.misc_fees);
}

/** 価格内訳が入力されているか。 */
export function hasBreakdown(b: PriceBreakdown): boolean {
  return feesSubtotal(b) > 0 || n(b.tax_amount) > 0;
}
