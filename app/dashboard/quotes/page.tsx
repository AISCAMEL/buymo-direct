import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_CLS, formatQuoteNo, type QuoteStatus } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; quote_no: number; vehicle_summary: string | null; total: number; status: QuoteStatus; created_at: string;
  dealer?: { name: string | null } | null;
};

export default async function MyQuotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/quotes');

  const { data } = await supabase
    .from('quotes')
    .select('id, quote_no, vehicle_summary, total, status, created_at, dealer:dealers!quotes_dealer_id_fkey(name)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-black"><FileText className="h-6 w-6 text-navy-500" />見積書の確認</h1>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">受け取った見積書はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((q) => (
            <li key={q.id}>
              <Link href={`/dashboard/quotes/${q.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="font-mono text-xs text-slate-400">{formatQuoteNo(q.quote_no)}</span>
                    {q.dealer?.name ?? '販売店'}
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
