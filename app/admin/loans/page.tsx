import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { adminSetLoanStatus } from '@/app/admin/actions';
import type { LoanApplication, LoanAppStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const NEXT: { status: LoanAppStatus; label: string; cls: string }[] = [
  { status: 'reviewing', label: '審査中', cls: 'border-amber-300 text-amber-700' },
  { status: 'approved', label: '承認', cls: 'border-emerald-300 text-emerald-700' },
  { status: 'rejected', label: '否決', cls: 'border-red-300 text-red-700' },
];
const LABEL: Record<string, string> = { submitted: '受付', reviewing: '審査中', approved: '承認', rejected: '否決' };

export default async function AdminLoansPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('loan_applications')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false });
  const apps = (data ?? []) as (LoanApplication & { profiles?: { display_name: string } })[];

  return (
    <div>
      <h1 className="mb-4 text-xl font-black">ローン仮審査の管理（{apps.length}）</h1>
      {apps.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-500">申込はありません。</p>
      ) : (
        <ul className="space-y-2">
          {apps.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {a.full_name}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      （{a.profiles?.display_name ?? '—'}）{a.phone} / {a.email}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    車両 {formatYen(a.vehicle_price)} ・ 頭金 {formatYen(a.down_payment)} ・ {a.term_months}回
                    {a.est_monthly ? ` ・ 月々${formatYen(a.est_monthly)}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    年収 {a.annual_income ?? '—'}万 ・ {a.employment ?? '—'} ・ 申込 {formatDate(a.created_at)}
                  </p>
                  {a.note && <p className="mt-1 text-xs text-slate-500">備考：{a.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="badge bg-slate-100 text-slate-600">現在：{LABEL[a.status]}</span>
                  <div className="flex gap-1">
                    {NEXT.map((n) => (
                      <form key={n.status} action={adminSetLoanStatus.bind(null, a.id, n.status)}>
                        <button className={`rounded-md border px-2 py-1 text-xs font-bold ${n.cls} disabled:opacity-40`} disabled={a.status === n.status}>
                          {n.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
