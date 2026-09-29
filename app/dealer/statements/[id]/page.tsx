import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { PrintButton } from '@/components/PrintButton';
import { StatementDocument, type StatementLine } from '@/components/StatementDocument';
import { formatCaseNo } from '@/lib/cases';

export const dynamic = 'force-dynamic';

export default async function DealerStatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, dealer } = (await requireDealer()) as any;

  const { data: st } = await supabase.from('fee_statements').select('*').eq('id', id).eq('dealer_id', dealer.dealerId).maybeSingle();
  if (!st) notFound();

  const { data: dz } = await supabase.from('dealers').select('name').eq('id', dealer.dealerId).maybeSingle();
  const [{ data: cc }, { data: sc }] = await Promise.all([
    supabase.from('case_charges').select('id, category, total, case:cases!case_charges_case_id_fkey(case_no)').eq('statement_id', id),
    supabase.from('sale_commissions').select('id, title, total').eq('statement_id', id),
  ]);

  const lines: StatementLine[] = [
    ...((cc ?? []) as any[]).map((r) => ({ id: r.id, label: `${r.case?.case_no ? formatCaseNo(r.case.case_no) + ' ' : ''}${r.category ?? '案件'}`, amount: r.total, kind: 'matching' as const })),
    ...((sc ?? []) as any[]).map((r) => ({ id: r.id, label: r.title ?? '車両販売', amount: r.total, kind: 'sales' as const })),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } .print-area { box-shadow: none !important; border: none !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex items-center justify-between">
        <Link href="/dealer/billing" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 手数料・請求へ
        </Link>
        <PrintButton />
      </div>
      <StatementDocument st={st as any} dealerName={(dz as { name?: string } | null)?.name ?? '—'} lines={lines} />
    </div>
  );
}
