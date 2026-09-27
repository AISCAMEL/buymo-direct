import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { cancelCase } from '@/app/cases/actions';
import {
  CASE_STATUS_LABEL, CASE_STATUS_CLS, CASE_SOURCE_LABEL, skillLabel, formatCaseNo,
  type CaseStatus, type CaseSource,
} from '@/lib/cases';

export const dynamic = 'force-dynamic';

type CaseRow = {
  id: string; case_no: number; type: string; source: CaseSource; status: CaseStatus;
  title: string | null; detail: string | null; created_at: string;
  partner?: { name?: string | null } | null;
};

export default async function DashboardCasesPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/cases');

  const { data } = await supabase
    .from('cases')
    .select('id, case_no, type, source, status, title, detail, created_at, partner:dealers(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const cases = (data ?? []) as unknown as CaseRow[];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">依頼中の案件（{cases.length}）</h1>
      </div>

      {created && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> 依頼を送信しました。加盟店からの返信をお待ちください。
        </div>
      )}

      {cases.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-slate-500">依頼中の案件はありません。</p>
          <Link href="/dealers" className="btn-accent mt-4 inline-block px-6">車のプロを探す</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {cases.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-navy-800">
                    <span className="font-mono text-xs text-slate-400">{formatCaseNo(c.case_no)}</span>
                    {skillLabel(c.type)}
                    <span className={`badge ${CASE_STATUS_CLS[c.status]}`}>{CASE_STATUS_LABEL[c.status]}</span>
                    <span className="badge bg-slate-100 text-slate-500">{CASE_SOURCE_LABEL[c.source]}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">依頼先: {c.partner?.name ?? '（本部にて調整中）'}</p>
                  {c.detail && <p className="mt-1 text-sm text-slate-500">{c.detail}</p>}
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(c.created_at)}</p>
                </div>
                {['new', 'accepted'].includes(c.status) && (
                  <form action={cancelCase.bind(null, c.id)}>
                    <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">取り下げ</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
