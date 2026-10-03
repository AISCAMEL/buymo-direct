import { requireAdmin } from '@/lib/admin';
import { formatYen, formatDateTime } from '@/lib/format';
import { FRANCHISE_STATUS_LABEL, FRANCHISE_STATUS_CLS, PAYMENT_METHOD_LABEL } from '@/lib/franchise';
import { adminMarkFranchiseInvoiced, adminMarkFranchisePaid, adminApproveFranchise, adminRejectFranchise } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '買取加盟申込 | 管理' };

type Row = {
  id: string; status: string; payment_method: string; company_name: string | null; contact_name: string | null;
  phone: string | null; prefecture: string | null; joining_fee: number; surcharge: number; total: number;
  note: string | null; created_at: string;
  user?: { display_name: string | null } | null;
};

export default async function AdminFranchisePage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('franchise_applications')
    .select('*, user:profiles!franchise_applications_user_id_fkey(display_name)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  const Btn = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <button className={`rounded-lg px-3 py-1.5 text-xs font-bold ${className}`}>{children}</button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">買取加盟申込</h1>
        <p className="text-sm text-slate-500">申込→（請求）→入金確認→承認で、加盟店作成・業者（買取加盟）・有料会員化まで自動で行います。</p>
      </div>

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
