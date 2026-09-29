// 手数料の締め請求（本部 → 加盟店）の共通定義。

export type StatementStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export const STATEMENT_STATUS_LABEL: Record<StatementStatus, string> = {
  draft: '下書き', issued: '発行済', paid: '入金済', cancelled: 'キャンセル',
};
export const STATEMENT_STATUS_CLS: Record<StatementStatus, string> = {
  draft: 'bg-slate-100 text-slate-500',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

/** STMT-000001 形式。 */
export function formatStatementNo(no: number | null | undefined): string {
  if (no == null) return 'STMT-—';
  return 'STMT-' + String(no).padStart(6, '0');
}

/** 締め日を算出（closingDay: 0=末日, 1〜28=その日）。基準月は date の月。 */
export function closingDateFor(date: Date, closingDay: number): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  let d: Date;
  if (!closingDay || closingDay <= 0) {
    d = new Date(y, m + 1, 0); // 当月末日
  } else {
    d = new Date(y, m, Math.min(closingDay, 28));
  }
  return d.toISOString().slice(0, 10);
}
