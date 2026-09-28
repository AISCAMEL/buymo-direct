// 見積書の共通定義（ステータス・カテゴリー・採番・集計）。

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted';

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: '下書き',
  sent: '送付済み',
  accepted: '承諾',
  declined: '見送り',
  expired: '期限切れ',
  converted: '請求へ',
};
export const QUOTE_STATUS_CLS: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-500',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-100 text-slate-500',
  expired: 'bg-amber-100 text-amber-700',
  converted: 'bg-navy-100 text-navy-700',
};

/** 見積項目のカテゴリー（プリセット）。 */
export const QUOTE_ITEM_PRESETS: { category: string; label: string }[] = [
  { category: 'vehicle', label: '車両本体価格' },
  { category: 'maintenance', label: '整備費用' },
  { category: 'warranty', label: '保証料' },
  { category: 'registration', label: '登録関連費用' },
  { category: 'delivery', label: '納車費用' },
  { category: 'recycle', label: 'リサイクル料金' },
  { category: 'option', label: 'オプション' },
  { category: 'other', label: 'その他費用' },
];

export type QuoteItemInput = { label: string; category: string; amount: number; taxable: boolean };

/** 明細・値引き・税率から集計。税は課税対象の明細に対して計算。 */
export function computeQuoteTotals(
  items: QuoteItemInput[],
  discount: number,
  taxRate: number
): { subtotal: number; taxableBase: number; tax: number; total: number } {
  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const disc = Math.max(0, Math.round(discount) || 0);
  const taxableBase = Math.max(
    0,
    items.filter((it) => it.taxable).reduce((s, it) => s + (Number(it.amount) || 0), 0) - disc
  );
  const tax = Math.round(taxableBase * taxRate);
  const total = Math.max(0, subtotal - disc + tax);
  return { subtotal, taxableBase, tax, total };
}

/** QT-000001 形式。 */
export function formatQuoteNo(no: number | null | undefined): string {
  if (no == null) return 'QT-—';
  return 'QT-' + String(no).padStart(6, '0');
}
