import { Building2, CheckCircle2, XCircle, PauseCircle, PlayCircle, Percent } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { approveDealer, rejectDealer, suspendDealer, reinstateDealer, setCommissionRate } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending: '審査中',
  approved: '承認済み',
  suspended: '停止中',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50',
  approved: 'text-emerald-600 bg-emerald-50',
  suspended: 'text-red-600 bg-red-50',
};

export default async function AdminDealersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createClient();
  const s = supabase as any;

  let query = s
    .from('dealers')
    .select('id, name, company_name, prefecture, status, commission_rate, approved_at, created_at, rejection_note, owner_id, profiles:owner_id(email, display_name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: dealers } = await query;

  // inventory counts per dealer
  const { data: counts } = await s
    .from('listings')
    .select('dealer_id, status')
    .in('dealer_id', (dealers ?? []).map((d: any) => d.id));

  const countMap: Record<string, { active: number; sold: number }> = {};
  for (const row of counts ?? []) {
    if (!countMap[row.dealer_id]) countMap[row.dealer_id] = { active: 0, sold: 0 };
    if (row.status === 'active') countMap[row.dealer_id].active++;
    if (row.status === 'sold') countMap[row.dealer_id].sold++;
  }

  const tabs = [
    { label: 'すべて', value: '' },
    { label: '審査中', value: 'pending' },
    { label: '承認済み', value: 'approved' },
    { label: '停止中', value: 'suspended' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-navy-500" />
        <h1 className="text-xl font-black">加盟店管理</h1>
        <span className="ml-auto rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
          {dealers?.length ?? 0}件
        </span>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <a
            key={t.value}
            href={t.value ? `/admin/dealers?status=${t.value}` : '/admin/dealers'}
            className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
              (status ?? '') === t.value
                ? 'border-navy-600 bg-navy-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {(dealers ?? []).map((d: any) => (
          <div key={d.id} className="card p-5 space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black truncate">{d.name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[d.status]}`}>
                    {STATUS_LABEL[d.status]}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {d.company_name && <span>{d.company_name}・</span>}
                  {d.prefecture}
                </p>
                <p className="text-xs text-slate-400">
                  オーナー: {d.profiles?.email ?? d.owner_id}
                  {d.profiles?.display_name && ` (${d.profiles.display_name})`}
                </p>
                {d.rejection_note && (
                  <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
                    却下メモ: {d.rejection_note}
                  </p>
                )}
              </div>

              {/* KPIs */}
              <div className="flex gap-4 text-center text-sm shrink-0">
                <div>
                  <p className="font-black text-navy-700">{countMap[d.id]?.active ?? 0}</p>
                  <p className="text-xs text-slate-400">在庫</p>
                </div>
                <div>
                  <p className="font-black text-navy-700">{countMap[d.id]?.sold ?? 0}</p>
                  <p className="text-xs text-slate-400">成約</p>
                </div>
                <div>
                  <p className="font-black text-navy-700">{d.commission_rate}%</p>
                  <p className="text-xs text-slate-400">手数料</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {d.status === 'pending' && (
                <>
                  <form action={approveDealer.bind(null, d.id)}>
                    <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> 承認
                    </button>
                  </form>
                  <RejectForm dealerId={d.id} />
                </>
              )}
              {d.status === 'approved' && (
                <form action={suspendDealer.bind(null, d.id)}>
                  <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600">
                    <PauseCircle className="h-4 w-4" /> 停止
                  </button>
                </form>
              )}
              {d.status === 'suspended' && (
                <form action={reinstateDealer.bind(null, d.id)}>
                  <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600">
                    <PlayCircle className="h-4 w-4" /> 停止解除
                  </button>
                </form>
              )}

              {/* Commission rate editor */}
              <form action={setCommissionRate} className="flex items-center gap-1.5 ml-auto">
                <input type="hidden" name="dealer_id" value={d.id} />
                <Percent className="h-4 w-4 text-slate-400" />
                <input
                  name="rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={d.commission_rate}
                  className="input w-20 py-1 text-sm"
                />
                <button type="submit" className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-bold hover:bg-slate-50">
                  手数料変更
                </button>
              </form>
            </div>

            <p className="text-xs text-slate-400">
              申込: {d.created_at?.slice(0, 10)}
              {d.approved_at && ` / 承認: ${d.approved_at.slice(0, 10)}`}
            </p>
          </div>
        ))}

        {(!dealers || dealers.length === 0) && (
          <p className="text-slate-400 text-sm py-8 text-center">加盟店はありません</p>
        )}
      </div>
    </div>
  );
}

function RejectForm({ dealerId }: { dealerId: string }) {
  const action = rejectDealer.bind(null, dealerId);
  return (
    <form action={action} className="flex gap-1.5">
      <input name="note" placeholder="却下メモ（任意）" className="input text-sm py-1" />
      <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-slate-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600">
        <XCircle className="h-4 w-4" /> 却下
      </button>
    </form>
  );
}
