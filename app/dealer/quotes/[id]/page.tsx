import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { PrintButton } from '@/components/PrintButton';
import { QuoteDocument } from '@/components/QuoteDocument';
import { updateQuoteStatus } from '@/app/dealer/quotes/actions';
import { type QuoteStatus } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

const NEXT: { status: QuoteStatus; label: string; cls: string }[] = [
  { status: 'sent', label: '送付済みにする', cls: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { status: 'accepted', label: '承諾', cls: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'declined', label: '見送り', cls: 'border-slate-300 text-slate-600 hover:bg-slate-50' },
];

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, dealer } = (await requireDealer()) as any;

  const { data: q } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('dealer_id', dealer.dealerId)
    .maybeSingle();
  if (!q) notFound();

  const { data: itemRows } = await supabase.from('quote_items').select('*').eq('quote_id', id).order('sort');
  const items = (itemRows ?? []) as { id: string; label: string; amount: number; taxable: boolean }[];

  const { data: dz } = await supabase
    .from('dealers')
    .select('name, company_name, trade_name, business_type, representative, address, phone, antique_license_no, tax_status, invoice_registered, invoice_number, bank_info')
    .eq('id', dealer.dealerId)
    .maybeSingle();
  const biz = dz as any;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } .print-area { box-shadow: none !important; border: none !important; } body { background: #fff !important; } }`}</style>

      <div className="no-print flex items-center justify-between">
        <Link href="/dealer/quotes" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 見積一覧へ
        </Link>
        <PrintButton />
      </div>

      {/* 見積書ドキュメント */}
      <QuoteDocument q={q} items={items} biz={biz} />

      {/* 操作 */}
      <div className="no-print flex flex-wrap gap-2">
        {NEXT.map((n) => (
          <form key={n.status} action={updateQuoteStatus.bind(null, q.id, n.status)}>
            <button disabled={q.status === n.status} className={`rounded-md border px-3 py-1.5 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}>
              {n.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
