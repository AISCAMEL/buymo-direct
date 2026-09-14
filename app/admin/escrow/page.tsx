import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { adminSetEscrowStatus } from '@/app/admin/actions';
import { ESCROW_STEPS } from '@/lib/constants';
import type { EscrowTransaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  ...Object.fromEntries(ESCROW_STEPS.map((s) => [s.key, s.label])),
  cancelled: 'キャンセル',
  disputed: '係争中',
};

export default async function AdminEscrowPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('escrow_transactions')
    .select('*, listings(title, maker, model), buyer:profiles!escrow_transactions_buyer_id_fkey(display_name), seller:profiles!escrow_transactions_seller_id_fkey(display_name)')
    .order('updated_at', { ascending: false });
  const txs = (data ?? []) as (EscrowTransaction & any)[];

  return (
    <div>
      <h1 className="mb-4 text-xl font-black">取引監視（{txs.length}）</h1>
      {txs.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-500">取引はありません。</p>
      ) : (
        <ul className="space-y-2">
          {txs.map((t) => {
            const total = t.amount + t.escrow_fee + t.title_fee + t.installment_fee;
            const terminal = t.status === 'completed' || t.status === 'cancelled';
            return (
              <li key={t.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{t.listings?.title ?? '車両'}</p>
                    <p className="text-sm text-slate-600">
                      {t.listings?.maker} {t.listings?.model} ・ 合計 {formatYen(total)}
                      {t.payment_method ? ` ・ ${t.payment_method}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      買主 {t.buyer?.display_name ?? '—'} / 売主 {t.seller?.display_name ?? '—'} ・ 更新 {formatDate(t.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge ${t.status === 'disputed' ? 'bg-red-100 text-red-700' : 'bg-navy-50 text-navy-600'}`}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    {!terminal && (
                      <div className="flex gap-1">
                        {t.status !== 'disputed' && (
                          <form action={adminSetEscrowStatus.bind(null, t.id, 'disputed')}>
                            <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700">係争にする</button>
                          </form>
                        )}
                        {t.status === 'disputed' && (
                          <form action={adminSetEscrowStatus.bind(null, t.id, 'inspection')}>
                            <button className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-700">係争解除</button>
                          </form>
                        )}
                        <form action={adminSetEscrowStatus.bind(null, t.id, 'cancelled')}>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600">キャンセル</button>
                        </form>
                      </div>
                    )}
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
