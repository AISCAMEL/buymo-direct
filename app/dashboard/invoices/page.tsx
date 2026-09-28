import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_CLS, formatInvoiceNo, type InvoiceStatus } from '@/lib/invoices';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; invoice_no: number; vehicle_summary: string | null; total: number; paid_amount: number;
  status: InvoiceStatus; created_at: string; due_date: string | null;
  dealer?: { name: string | null } | null;
};

export default async function MyInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/invoices');

  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_no, vehicle_summary, total, paid_amount, status, created_at, due_date, dealer:dealers!invoices_dealer_id_fkey(name)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-black"><Receipt className="h-6 w-6 text-navy-500" />請求書・お支払い</h1>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">請求書はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((v) => (
            <li key={v.id}>
              <Link href={`/dashboard/invoices/${v.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="font-mono text-xs text-slate-400">{formatInvoiceNo(v.invoice_no)}</span>
                    {v.dealer?.name ?? '販売店'}
                    <span className={`badge ${INVOICE_STATUS_CLS[v.status]}`}>{INVOICE_STATUS_LABEL[v.status]}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{v.vehicle_summary ?? '—'} ・ 支払期限 {formatDate(v.due_date ?? v.created_at)}</p>
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
