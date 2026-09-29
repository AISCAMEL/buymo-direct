import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { PrintButton } from '@/components/PrintButton';
import { StatementDocument, type StatementLine } from '@/components/StatementDocument';
import { setStatementStatus } from '@/app/admin/statements/actions';
import { formatCaseNo } from '@/lib/cases';

export const dynamic = 'force-dynamic';

export default async function AdminStatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const svc = createServiceClient();

  const { data: st } = await svc.from('fee_statements').select('*').eq('id', id).maybeSingle();
  if (!st) notFound();

  const { data: dz } = await svc.from('dealers').select('name').eq('id', (st as { dealer_id: string }).dealer_id).maybeSingle();
  const [{ data: cc }, { data: sc }] = await Promise.all([
    svc.from('case_charges').select('id, category, total, case:cases!case_charges_case_id_fkey(case_no)').eq('statement_id', id),
    svc.from('sale_commissions').select('id, title, total').eq('statement_id', id),
  ]);

  const lines: StatementLine[] = [
    ...((cc ?? []) as any[]).map((r) => ({ id: r.id, label: `${r.case?.case_no ? formatCaseNo(r.case.case_no) + ' ' : ''}${r.category ?? '案件'}`, amount: r.total, kind: 'matching' as const })),
    ...((sc ?? []) as any[]).map((r) => ({ id: r.id, label: r.title ?? '車両販売', amount: r.total, kind: 'sales' as const })),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } .print-area { box-shadow: none !important; border: none !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex items-center justify-between">
        <Link href="/admin/statements" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 締め請求一覧へ
        </Link>
        <PrintButton />
      </div>

      <StatementDocument st={st as any} dealerName={(dz as { name?: string } | null)?.name ?? '—'} lines={lines} />

      <div className="no-print flex flex-wrap gap-2">
        <form action={setStatementStatus.bind(null, id, 'paid')}>
          <button disabled={st.status === 'paid'} className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-30">入金済にする</button>
        </form>
        <form action={setStatementStatus.bind(null, id, 'cancelled')}>
          <button disabled={st.status === 'cancelled'} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-30">キャンセル（差し戻し）</button>
        </form>
      </div>
    </div>
  );
}
