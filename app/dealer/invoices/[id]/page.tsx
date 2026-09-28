import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatYen, formatDate } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { updateInvoiceStatus, recordPayment } from '@/app/dealer/invoices/actions';
import { type InvoiceStatus } from '@/lib/invoices';

export const dynamic = 'force-dynamic';

const NEXT: { status: InvoiceStatus; label: string; cls: string }[] = [
  { status: 'sent', label: '送付済にする', cls: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { status: 'awaiting_payment', label: '入金待ちにする', cls: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { status: 'cancelled', label: 'キャンセル', cls: 'border-red-200 text-red-600 hover:bg-red-50' },
];

export default async function DealerInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, dealer } = (await requireDealer()) as any;

  const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).eq('dealer_id', dealer.dealerId).maybeSingle();
  if (!inv) notFound();

  const { data: itemRows } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort');
  const items = (itemRows ?? []) as { id: string; label: string; amount: number; taxable: boolean }[];

  const { data: biz } = await supabase
    .from('dealers')
    .select('name, company_name, trade_name, business_type, representative, address, phone, antique_license_no, tax_status')
    .eq('id', dealer.dealerId)
    .maybeSingle();

  const { data: pays } = await supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('paid_at', { ascending: false });
  const payments = (pays ?? []) as { id: string; amount: number; method: string | null; paid_at: string; note: string | null }[];
  const balance = Math.max(0, (inv.total ?? 0) - (inv.paid_amount ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } .print-area { box-shadow: none !important; border: none !important; } body { background: #fff !important; } }`}</style>

      <div className="no-print flex items-center justify-between">
        <Link href="/dealer/invoices" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 請求書一覧へ
        </Link>
        <PrintButton />
      </div>

      <InvoiceDocument inv={inv} items={items} biz={biz} />

      {/* 入金記録 */}
      <div className="no-print card space-y-3 p-5">
        <h2 className="font-bold text-slate-700">入金の記録</h2>
        <p className="text-sm text-slate-500">残額 <span className="font-bold text-amber-700">{formatYen(balance)}</span>（請求 {formatYen(inv.total)} ／ 入金済 {formatYen(inv.paid_amount)}）</p>
        {inv.status !== 'cancelled' && balance > 0 && (
          <form action={recordPayment.bind(null, inv.id)} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label">入金額（円）</label>
              <input name="amount" type="number" min={1} defaultValue={balance} className="input w-40" />
            </div>
            <div>
              <label className="label">方法</label>
              <select name="method" className="input w-32">
                <option value="bank">銀行振込</option>
                <option value="cash">現金</option>
                <option value="card">カード</option>
                <option value="other">その他</option>
              </select>
            </div>
            <input name="note" className="input flex-1" placeholder="メモ（任意）" />
            <button className="btn-accent">入金を記録</button>
          </form>
        )}
        {payments.length > 0 && (
          <ul className="space-y-1 border-t border-slate-100 pt-2 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between text-slate-600">
                <span>{formatDate(p.paid_at)} ・ {p.method ?? '—'}{p.note ? `（${p.note}）` : ''}</span>
                <span className="font-bold">{formatYen(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ステータス操作 */}
      <div className="no-print flex flex-wrap gap-2">
        {NEXT.map((n) => (
          <form key={n.status} action={updateInvoiceStatus.bind(null, inv.id, n.status)}>
            <button disabled={inv.status === n.status} className={`rounded-md border px-3 py-1.5 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}>
              {n.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
