import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatYen, formatDate } from '@/lib/format';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_CLS, formatInvoiceNo, type InvoiceStatus } from '@/lib/invoices';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; invoice_no: number; customer_name: string | null; vehicle_summary: string | null;
  total: number; paid_amount: number; status: InvoiceStatus; created_at: string; due_date: string | null;
};

export default async function DealerInvoicesPage() {
  const { supabase, dealer } = (await requireDealer()) as any;
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_no, customer_name, vehicle_summary, total, paid_amount, status, created_at, due_date')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];

  const outstanding = rows
    .filter((r) => ['issued', 'sent', 'awaiting_payment', 'partially_paid'].includes(r.status))
    .reduce((s, r) => s + Math.max(0, (r.total ?? 0) - (r.paid_amount ?? 0)), 0);
  const paid = rows.reduce((s, r) => s + (r.paid_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-black"><Receipt className="h-6 w-6 text-navy-500" />請求書</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><p className="text-xl font-black text-amber-600">{formatYen(outstanding)}</p><p className="text-xs text-slate-500">未回収</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-black text-emerald-600">{formatYen(paid)}</p><p className="text-xs text-slate-500">入金済</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-black text-slate-700">{rows.length}</p><p className="text-xs text-slate-500">請求件数</p></div>
      </div>

      <p className="text-xs text-slate-500">請求書は「見積書」から作成できます（見積詳細 →「請求書を作成」）。</p>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">請求書はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((v) => (
            <li key={v.id}>
              <Link href={`/dealer/invoices/${v.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="font-mono text-xs text-slate-400">{formatInvoiceNo(v.invoice_no)}</span>
                    {v.customer_name ?? 'お客様'} 様
                    <span className={`badge ${INVOICE_STATUS_CLS[v.status]}`}>{INVOICE_STATUS_LABEL[v.status]}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{v.vehicle_summary ?? '—'} ・ 期限 {formatDate(v.due_date ?? v.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-navy-700">{formatYen(v.total)}</p>
                  {v.paid_amount > 0 && v.paid_amount < v.total && <p className="text-[11px] text-amber-600">残 {formatYen(v.total - v.paid_amount)}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
