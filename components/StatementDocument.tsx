import { formatYen } from '@/lib/format';
import { STATEMENT_STATUS_LABEL, STATEMENT_STATUS_CLS, formatStatementNo, type StatementStatus } from '@/lib/fee-statement';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getFullYear()}/${String(x.getMonth() + 1).padStart(2, '0')}/${String(x.getDate()).padStart(2, '0')}`;
}

export type StatementDoc = {
  statement_no: number; period_end: string; due_date: string | null;
  matching_total: number; sales_total: number; subtotal: number; tax: number; total: number;
  status: string; created_at: string;
};
export type StatementLine = { id: string; label: string; amount: number; kind: 'matching' | 'sales' };

/** 手数料 締め請求書（本部 → 加盟店）。 */
export function StatementDocument({ st, dealerName, lines }: { st: StatementDoc; dealerName: string; lines: StatementLine[] }) {
  return (
    <div className="print-area card space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide">手数料 締め請求書</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{formatStatementNo(st.statement_no)}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>締め日：{fmtDate(st.period_end)}</p>
          <p>支払期限：{fmtDate(st.due_date)}</p>
          <span className={`badge mt-1 inline-block ${STATEMENT_STATUS_CLS[st.status as StatementStatus]}`}>{STATEMENT_STATUS_LABEL[st.status as StatementStatus]}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold text-slate-400">請求先（加盟店）</p>
          <p className="text-lg font-bold">{dealerName} 御中</p>
        </div>
        <div>
          <p className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold text-slate-400">発行元</p>
          <p className="font-bold">BUYMO ダイレクト 運営</p>
          <p className="text-xs text-slate-500">プラットフォーム利用手数料</p>
        </div>
      </div>

      <div className="rounded-xl bg-navy-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-500">ご請求金額（税込）</p>
        <p className="text-3xl font-black text-navy-700">{formatYen(st.total)}</p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-400">
            <th className="py-1.5 text-left font-medium">内訳</th>
            <th className="py-1.5 text-right font-medium">金額（税込）</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-slate-50">
              <td className="py-1.5">
                <span className={`mr-1 rounded px-1.5 py-0.5 text-[10px] ${l.kind === 'matching' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {l.kind === 'matching' ? 'マッチング' : '販売'}
                </span>
                {l.label}
              </td>
              <td className="py-1.5 text-right tabular-nums">{formatYen(l.amount)}</td>
            </tr>
          ))}
          {lines.length === 0 && <tr><td colSpan={2} className="py-3 text-center text-slate-400">明細なし</td></tr>}
        </tbody>
      </table>

      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">マッチング手数料</dt><dd>{formatYen(st.matching_total)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">販売手数料</dt><dd>{formatYen(st.sales_total)}</dd></div>
        <div className="flex justify-between text-xs text-slate-400"><dt>（うち消費税）</dt><dd>{formatYen(st.tax)}</dd></div>
        <div className="flex justify-between border-t border-slate-200 pt-1 text-base"><dt className="font-black text-slate-700">合計</dt><dd className="font-black text-navy-700">{formatYen(st.total)}</dd></div>
      </dl>
    </div>
  );
}
