import { Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_CLS, formatInvoiceNo, type InvoiceStatus } from '@/lib/invoices';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; invoice_no: number; customer_name: string | null; vehicle_summary: string | null;
  total: number; paid_amount: number; status: InvoiceStatus; created_at: string; due_date: string | null;
  dealer?: { name: string | null } | null;
};

export default async function AdminInvoicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_no, customer_name, vehicle_summary, total, paid_amount, status, created_at, due_date, dealer:dealers!invoices_dealer_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  const outstanding = rows
    .filter((r) => ['issued', 'sent', 'awaiting_payment', 'partially_paid'].includes(r.status))
    .reduce((s, r) => s + Math.max(0, (r.total ?? 0) - (r.paid_amount ?? 0)), 0);
  const billed = rows.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (r.total ?? 0), 0);
  const collected = rows.reduce((s, r) => s + (r.paid_amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-black"><Receipt className="h-6 w-6 text-navy-500" />請求・入金管理</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><p className="text-xl font-black text-slate-700">{formatYen(billed)}</p><p className="text-xs text-slate-500">請求総額</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-black text-emerald-600">{formatYen(collected)}</p><p className="text-xs text-slate-500">入金済</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-black text-amber-600">{formatYen(outstanding)}</p><p className="text-xs text-slate-500">未回収</p></div>
      </div>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">請求書はまだありません。</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>{['番号', '販売店', '請求先', '金額', '入金', 'ステータス', '期限'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{formatInvoiceNo(v.invoice_no)}</td>
                    <td className="px-3 py-2 font-bold text-navy-800">{v.dealer?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{v.customer_name ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatYen(v.total)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatYen(v.paid_amount)}</td>
                    <td className="px-3 py-2"><span className={`badge ${INVOICE_STATUS_CLS[v.status]}`}>{INVOICE_STATUS_LABEL[v.status]}</span></td>
                    <td className="px-3 py-2 text-xs text-slate-400">{formatDate(v.due_date ?? v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
