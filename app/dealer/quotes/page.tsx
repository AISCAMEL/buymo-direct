import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatYen, formatDate } from '@/lib/format';
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_CLS, formatQuoteNo, type QuoteStatus } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; quote_no: number; customer_name: string | null; vehicle_summary: string | null;
  total: number; status: QuoteStatus; created_at: string;
};

export default async function DealerQuotesPage() {
  const { supabase, dealer } = (await requireDealer()) as any;
  const { data } = await supabase
    .from('quotes')
    .select('id, quote_no, customer_name, vehicle_summary, total, status, created_at')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-black"><FileText className="h-6 w-6 text-navy-500" />見積書</h1>
        <Link href="/dealer/quotes/new" className="btn-accent flex items-center gap-1 text-sm"><Plus className="h-4 w-4" />新規見積</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          見積書はまだありません。<Link href="/dealer/quotes/new" className="font-bold text-navy-400 hover:underline">最初の見積を作成</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((q) => (
            <li key={q.id}>
              <Link href={`/dealer/quotes/${q.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="font-mono text-xs text-slate-400">{formatQuoteNo(q.quote_no)}</span>
                    {q.customer_name ?? 'お客様'} 様
                    <span className={`badge ${QUOTE_STATUS_CLS[q.status]}`}>{QUOTE_STATUS_LABEL[q.status]}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{q.vehicle_summary ?? '—'} ・ {formatDate(q.created_at)}</p>
                </div>
                <p className="text-lg font-black text-navy-700">{formatYen(q.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
