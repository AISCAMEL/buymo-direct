import Link from 'next/link';
import { AlertTriangle, Flag, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { adminSetReportStatus } from '@/app/admin/actions';
import type { Report, ReportStatus, ReportTarget } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ReportWithReporter = Report & { reporter?: { display_name: string } };

const STATUS_NEXT: { status: ReportStatus; label: string; cls: string }[] = [
  { status: 'reviewing', label: '確認中にする', cls: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { status: 'resolved', label: '対応済み', cls: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'dismissed', label: '却下', cls: 'border-slate-300 text-slate-600 hover:bg-slate-50' },
];
const STATUS_LABEL: Record<ReportStatus, string> = { open: '未対応', reviewing: '確認中', resolved: '対応済み', dismissed: '却下' };
const STATUS_CLS: Record<ReportStatus, string> = {
  open: 'bg-red-100 text-red-700',
  reviewing: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-slate-100 text-slate-500',
};
const STATUS_ICON: Record<ReportStatus, React.ElementType> = { open: AlertTriangle, reviewing: Clock, resolved: CheckCircle2, dismissed: XCircle };
const TARGET_LABEL: Record<ReportTarget, string> = { listing: '出品', user: 'ユーザー', review: 'レビュー' };

function targetHref(type: ReportTarget, id: string): string | null {
  if (type === 'listing') return `/listings/${id}`;
  if (type === 'user') return `/users/${id}`;
  return null;
}

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_id_fkey(display_name)')
    .order('created_at', { ascending: false });
  const reports = (data ?? []) as ReportWithReporter[];

  const count = (s: ReportStatus | 'all') => (s === 'all' ? reports.length : reports.filter((r) => r.status === s).length);
  const openCount = count('open');

  return (
    <div className="space-y-5">
      {openCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Flag className="h-4 w-4 text-red-600" />
          <p className="text-sm font-bold text-red-700">未対応の通報が {openCount} 件あります</p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">
        {(['all', 'open', 'reviewing', 'resolved'] as const).map((s) => (
          <div key={s} className="card p-3 text-center">
            <p className={`text-xl font-black ${s === 'open' && count(s) > 0 ? 'text-red-600' : s === 'reviewing' && count(s) > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {count(s)}
            </p>
            <p className="text-xs text-slate-500">{s === 'all' ? '全件' : STATUS_LABEL[s as ReportStatus]}</p>
          </div>
        ))}
      </div>

      <h1 className="text-xl font-black">通報の管理（{reports.length}）</h1>

      {reports.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-500">通報はありません。</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const href = targetHref(r.target_type, r.target_id);
            const StatusIcon = STATUS_ICON[r.status];
            return (
              <li key={r.id} className={`card p-4 ${r.status === 'open' ? 'border-red-200' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      <span className="badge mr-2 bg-slate-100 text-slate-600">{TARGET_LABEL[r.target_type]}</span>
                      {r.reason}
                    </p>
                    {r.detail && <p className="mt-1 text-sm text-slate-600">{r.detail}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      通報者: {r.reporter?.display_name ?? '—'} ・ {formatDateTime(r.created_at)}
                      {href && (<> ・ <Link href={href} className="font-bold text-navy-400 hover:underline">対象を見る</Link></>)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge flex items-center gap-1 ${STATUS_CLS[r.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {STATUS_LABEL[r.status]}
                    </span>
                    <div className="flex gap-1">
                      {STATUS_NEXT.map((n) => (
                        <form key={n.status} action={adminSetReportStatus.bind(null, r.id, n.status)}>
                          <button disabled={r.status === n.status}
                            className={`rounded-md border px-2 py-1 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}>
                            {n.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
