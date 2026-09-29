import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/settings';
import { formatYen, formatDate } from '@/lib/format';
import { closeAllBilling } from '@/app/admin/statements/actions';
import { STATEMENT_STATUS_LABEL, STATEMENT_STATUS_CLS, formatStatementNo, closingDateFor, type StatementStatus } from '@/lib/fee-statement';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; statement_no: number; period_end: string; total: number; status: StatementStatus; due_date: string | null;
  dealer?: { name: string | null } | null;
};

export default async function AdminStatementsPage() {
  const supabase = await createClient();
  const cfg = await getPricingConfig();
  const defaultClosing = closingDateFor(new Date(), cfg.billingClosingDay);

  const { data } = await supabase
    .from('fee_statements')
    .select('id, statement_no, period_end, total, status, due_date, dealer:dealers!fee_statements_dealer_id_fkey(name)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  const outstanding = rows.filter((r) => r.status === 'issued').reduce((s, r) => s + (r.total ?? 0), 0);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-black"><CalendarClock className="h-6 w-6 text-navy-500" />手数料の締め請求</h1>

      {/* 締め処理 */}
      <div className="card space-y-3 p-5">
        <h2 className="font-bold text-slate-700">締めを実行</h2>
        <p className="text-sm text-slate-500">
          指定した締め日までの未請求手数料（マッチング＋販売）を、加盟店ごとに1枚の請求書へまとめます。
          締め日は既定で「{cfg.billingClosingDay === 0 ? '月末' : cfg.billingClosingDay + '日'}」・支払期限は締め後{cfg.billingDueDays}日です（料金設定で変更可）。
        </p>
        <form action={closeAllBilling} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">締め日</label>
            <input name="period_end" type="date" defaultValue={defaultClosing} className="input w-48" />
          </div>
          <button className="btn-accent">この締め日で全加盟店を締める</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center"><p className="text-xl font-black text-amber-600">{formatYen(outstanding)}</p><p className="text-xs text-slate-500">未回収（発行済）</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-black text-slate-700">{rows.length}</p><p className="text-xs text-slate-500">締め請求 件数</p></div>
      </div>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">締め請求はまだありません。上の「締める」から発行してください。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((v) => (
            <li key={v.id}>
              <Link href={`/admin/statements/${v.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="font-mono text-xs text-slate-400">{formatStatementNo(v.statement_no)}</span>
                    {v.dealer?.name ?? '—'}
                    <span className={`badge ${STATEMENT_STATUS_CLS[v.status]}`}>{STATEMENT_STATUS_LABEL[v.status]}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">締め日 {formatDate(v.period_end)} ・ 期限 {formatDate(v.due_date ?? v.period_end)}</p>
                </div>
                <p className="text-lg font-black text-navy-700">{formatYen(v.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
