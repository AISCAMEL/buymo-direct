// 請求書の共通定義（ステータス・採番・入金判定）。

export type InvoiceStatus =
  | 'draft' | 'issued' | 'sent' | 'awaiting_payment' | 'partially_paid' | 'paid' | 'cancelled';

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: '下書き',
  issued: '発行済',
  sent: '送付済',
  awaiting_payment: '入金待ち',
  partially_paid: '一部入金',
  paid: '入金済',
  cancelled: 'キャンセル',
};
export const INVOICE_STATUS_CLS: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-500',
  issued: 'bg-blue-100 text-blue-700',
  sent: 'bg-blue-100 text-blue-700',
  awaiting_payment: 'bg-amber-100 text-amber-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

/** 入金額と請求額から入金ステータスを導出（キャンセルは維持）。 */
export function derivePaymentStatus(total: number, paid: number, current: InvoiceStatus): InvoiceStatus {
  if (current === 'cancelled') return 'cancelled';
  if (paid <= 0) return current === 'draft' ? 'draft' : 'awaiting_payment';
  if (paid < total) return 'partially_paid';
  return 'paid';
}

/** INV-000001 形式。 */
export function formatInvoiceNo(no: number | null | undefined): string {
  if (no == null) return 'INV-—';
  return 'INV-' + String(no).padStart(6, '0');
}
