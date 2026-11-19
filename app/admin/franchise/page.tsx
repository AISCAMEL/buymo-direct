import { requireAdmin } from '@/lib/admin';
import { formatYen, formatDateTime } from '@/lib/format';
import { FRANCHISE_STATUS_LABEL, FRANCHISE_STATUS_CLS, PAYMENT_METHOD_LABEL } from '@/lib/franchise';
import { summarizeAttribution, attrLabel, type AttrRow } from '@/lib/attribution';
import { adminMarkFranchiseInvoiced, adminMarkFranchisePaid, adminApproveFranchise, adminRejectFranchise } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '買取加盟申込 | 管理' };

type Row = {
  id: string; status: string; payment_method: string; company_name: string | null; contact_name: string | null;
  phone: string | null; prefecture: string | null; joining_fee: number; surcharge: number; total: number;
  note: string | null; created_at: string;
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; referrer?: string | null;
  user?: { display_name: string | null } | null;
};

export default async function AdminFranchisePage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('franchise_applications')
    .select('*, user:profiles!franchise_applications_user_id_fkey(display_name)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const attr = summarizeAttribution(rows as AttrRow[]);

  const Btn = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <button className={`rounded-lg px-3 py-1.5 text-xs font-bold ${className}`}>{children}</button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">買取加盟申込</h1>
        <p className="text-sm text-slate-500">申込→（請求）→入金確認→承認で、加盟店作成・業者（買取加盟）・有料会員化まで自動で行います。</p>
      </div>

      {/* 動線（流入元）ダッシュボード */}
      {attr.total > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-black text-navy-800">📈 流入元（動線）— 申込 {attr.total} 件</h2>
          <p className="mb-3 text-xs text-slate-500">広告・リンクに <code className="rounded bg-slate-100 px-1">?utm_source=…&utm_medium=…&utm_campaign=…</code> を付けると、どの動線から申込に至ったかを集計します。</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {attr.buckets.map((b) => {
              const pct = Math.round((b.count / attr.total) * 100);
              const camps = Object.entries(b.campaigns).sort((a, c) => c[1] - a[1]);
              return (
                <div key={b.label} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">{b.label}</span>
                    <span className="text-sm font-black tabular-nums text-accent-700">{b.count}件 <span className="text-xs font-normal text-slate-400">({pct}%)</span></span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-accent-500" style={{ width: pct + '%' }} />
                  </div>
                  {camps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {camps.map(([c, n]) => (
                        <span key={c} className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">{c}：{n}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">申込はまだありません。</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${FRANCHISE_STATUS_CLS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{FRANCHISE_STATUS_LABEL[r.status] ?? r.status}</span>
                <span className="font-black">{r.company_name || r.user?.display_name || '（屋号未設定）'}</span>
                <span className="text-sm text-slate-500">{r.contact_name}</span>
                <span className="ml-auto text-xs text-slate-400">{formatDateTime(r.created_at)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <p>支払い：{PAYMENT_METHOD_LABEL[r.payment_method as 'invoice' | 'card'] ?? r.payment_method}</p>
                <p>請求総額：<b className="tabular-nums">{formatYen(r.total)}</b>（加盟金 {formatYen(r.joining_fee)}{r.surcharge ? ` ＋手数料 ${formatYen(r.surcharge)}` : ''}）</p>
                {r.phone && <p>電話：{r.phone}</p>}
                {r.prefecture && <p>地域：{r.prefecture}</p>}
                {(r.utm_source || r.referrer) && (
                  <p className="sm:col-span-2">流入元：<span className="font-bold">{attrLabel(r)}</span>{r.utm_campaign ? `（${r.utm_campaign}）` : ''}</p>
                )}
              </div>
              {r.note && <p className="mt-1 rounded bg-slate-50 p-2 text-xs text-slate-500">{r.note}</p>}

              {r.status !== 'approved' && r.status !== 'rejected' && r.status !== 'cancelled' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === 'pending' && (
                    <form action={adminMarkFranchiseInvoiced.bind(null, r.id)}>
                      <Btn className="border border-slate-300 text-slate-600 hover:bg-slate-50">請求済みにする</Btn>
                    </form>
                  )}
                  {(r.status === 'pending' || r.status === 'invoiced') && (
                    <form action={adminMarkFranchisePaid.bind(null, r.id)}>
                      <Btn className="border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">入金確認</Btn>
                    </form>
                  )}
                  {r.status === 'paid' && (
                    <form action={adminApproveFranchise.bind(null, r.id)}>
                      <Btn className="bg-emerald-600 text-white hover:bg-emerald-700">加盟を承認（加盟店作成）</Btn>
                    </form>
                  )}
                  <form action={adminRejectFranchise.bind(null, r.id)}>
                    <Btn className="border border-slate-300 text-slate-500 hover:bg-slate-50">見送り</Btn>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
