import { redirect } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { partnerSetCaseStatus } from '@/app/cases/actions';
import {
  CASE_STATUS_LABEL, CASE_STATUS_CLS, CASE_SOURCE_LABEL, skillLabel, formatCaseNo, partnerNextStatuses,
  type CaseStatus, type CaseSource,
} from '@/lib/cases';

export const dynamic = 'force-dynamic';

type CaseRow = {
  id: string; case_no: number; type: string; source: CaseSource; status: CaseStatus;
  title: string | null; detail: string | null; created_at: string;
  user?: { display_name?: string | null } | null;
};

export default async function DealerCasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/cases');

  // 自分の加盟店を特定
  const { data: dealer } = await supabase.from('dealers').select('id, status').eq('owner_id', user.id).maybeSingle();
  if (!dealer) redirect('/dealer/register');

  const { data } = await supabase
    .from('cases')
    .select('id, case_no, type, source, status, title, detail, created_at, user:profiles!cases_user_id_fkey(display_name)')
    .eq('partner_id', (dealer as { id: string }).id)
    .order('created_at', { ascending: false });
  const cases = (data ?? []) as unknown as CaseRow[];

  const newCount = cases.filter((c) => c.status === 'new').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Inbox className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">案件（{cases.length}）</h1>
        {newCount > 0 && <span className="badge bg-amber-100 text-amber-700">新着 {newCount}</span>}
      </div>

      {cases.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">まだ案件はありません。プロフィールとスキルを充実させると、直接依頼が届きやすくなります。</p>
      ) : (
        <ul className="space-y-2">
          {cases.map((c) => {
            const next = partnerNextStatuses(c.status);
            return (
              <li key={c.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-navy-800">
                      <span className="font-mono text-xs text-slate-400">{formatCaseNo(c.case_no)}</span>
                      {skillLabel(c.type)}
                      <span className={`badge ${CASE_STATUS_CLS[c.status]}`}>{CASE_STATUS_LABEL[c.status]}</span>
                      <span className="badge bg-slate-100 text-slate-500">{CASE_SOURCE_LABEL[c.source]}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">依頼者: {c.user?.display_name ?? '—'}</p>
                    {c.detail && <p className="mt-1 text-sm text-slate-500">{c.detail}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(c.created_at)}</p>
                  </div>
                  {next.length > 0 && (
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {next.map((n) => (
                        <form key={n.status} action={partnerSetCaseStatus.bind(null, c.id, n.status)}>
                          <button className={`rounded-md border px-3 py-1.5 text-xs font-bold ${n.status === 'declined' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-navy-300 text-navy-700 hover:bg-navy-50'}`}>
                            {n.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
