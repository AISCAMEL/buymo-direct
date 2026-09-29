import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { adminSetLeadStatus, adminConvertLeadToDealer } from '@/app/admin/actions';
import { LEAD_WISH_LABEL, LEAD_STATUS_LABEL, LEAD_STATUS_CLS } from '@/lib/membership';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; name: string | null; email: string | null; phone: string | null;
  business_type_wish: string | null; message: string | null; source: string | null;
  status: string; created_at: string; user_id: string | null;
};

const NEXT: { status: string; label: string; cls: string }[] = [
  { status: 'contacted', label: '連絡済み', cls: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { status: 'converted', label: '加盟', cls: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'closed', label: '見送り', cls: 'border-slate-300 text-slate-600 hover:bg-slate-50' },
];

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('dealer_leads').select('*').order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];
  const newCount = rows.filter((r) => r.status === 'new').length;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-black"><UserPlus className="h-6 w-6 text-navy-500" />加盟店・プロ希望</h1>
      {newCount > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">未対応の申込が {newCount} 件あります</p>}

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">申込はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {r.name ?? '—'}
                    <span className={`badge ${LEAD_STATUS_CLS[r.status] ?? 'bg-slate-100 text-slate-500'}`}>{LEAD_STATUS_LABEL[r.status] ?? r.status}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {LEAD_WISH_LABEL[r.business_type_wish ?? ''] ?? r.business_type_wish} ・ {formatDateTime(r.created_at)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{r.email}{r.phone ? ` ／ ${r.phone}` : ''}</p>
                  {r.message && <p className="mt-1 text-sm text-slate-500">{r.message}</p>}
                  {r.source && <p className="mt-1 text-[11px] text-slate-400">流入元: {r.source}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {r.status !== 'converted' && (
                    <form action={adminConvertLeadToDealer.bind(null, r.id)}>
                      <button
                        disabled={!r.user_id}
                        title={r.user_id ? '' : '発行には本人の会員登録が必要です'}
                        className="rounded-md bg-navy-600 px-3 py-1.5 text-xs font-black text-white hover:bg-navy-700 disabled:opacity-40"
                      >
                        加盟店として発行
                      </button>
                    </form>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {NEXT.map((n) => (
                      <form key={n.status} action={adminSetLeadStatus.bind(null, r.id, n.status)}>
                        <button disabled={r.status === n.status} className={`rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}>
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
