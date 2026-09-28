import { Receipt, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDateTime } from '@/lib/format';
import { adminSetChargeStatus, adminSetSaleCommissionStatus } from '@/app/admin/actions';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_CLS, type ChargeStatus } from '@/lib/matching-fee';

export const dynamic = 'force-dynamic';

type ChargeRow = {
  id: string; case_id: string; category: string | null;
  base_amount: number; fee_rate: number; fee_amount: number; tax: number; total: number;
  status: ChargeStatus; created_at: string;
  case?: { case_no: number; title: string | null } | null;
  dealer?: { name: string | null } | null;
};

type SaleRow = {
  id: string; title: string | null; sale_amount: number; rate: number;
  fee_amount: number; tax: number; total: number; status: ChargeStatus; created_at: string;
  dealer?: { name: string | null } | null;
};

const NEXT: { status: ChargeStatus; label: string; cls: string }[] = [
  { status: 'invoiced', label: '請求済みに', cls: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { status: 'paid', label: '入金済みに', cls: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'waived', label: '免除', cls: 'border-slate-300 text-slate-600 hover:bg-slate-50' },
  { status: 'cancelled', label: '取消', cls: 'border-red-200 text-red-600 hover:bg-red-50' },
];

export default async function AdminBillingPage() {
  const supabase = await createClient();

  const [{ data }, { data: saleData }] = await Promise.all([
    supabase
      .from('case_charges')
      .select('id, case_id, category, base_amount, fee_rate, fee_amount, tax, total, status, created_at, case:cases!case_charges_case_id_fkey(case_no, title), dealer:dealers!case_charges_partner_id_fkey(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('sale_commissions')
      .select('id, title, sale_amount, rate, fee_amount, tax, total, status, created_at, dealer:dealers!sale_commissions_dealer_id_fkey(name)')
      .order('created_at', { ascending: false }),
  ]);
  const charges = (data ?? []) as unknown as ChargeRow[];
  const sales = (saleData ?? []) as unknown as SaleRow[];

  const allTotals = [...charges, ...sales];
  const sumAll = (st: ChargeStatus) => allTotals.filter((c) => c.status === st).reduce((s, c) => s + (c.total ?? 0), 0);
  const pendingTotal = sumAll('pending');
  const invoicedTotal = sumAll('invoiced');
  const paidTotal = sumAll('paid');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Receipt className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">手数料の請求管理</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-xl font-black text-amber-600">{formatYen(pendingTotal)}</p>
          <p className="text-xs text-slate-500">未請求</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-black text-blue-600">{formatYen(invoicedTotal)}</p>
          <p className="text-xs text-slate-500">請求済み</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-black text-emerald-600">{formatYen(paidTotal)}</p>
          <p className="text-xs text-slate-500">入金済み</p>
        </div>
        <div className="card flex flex-col items-center justify-center p-4 text-center">
          <Wallet className="mb-1 h-5 w-5 text-slate-400" />
          <p className="text-xs text-slate-500">請求 {charges.length + sales.length} 件</p>
        </div>
      </div>

      {/* 自社在庫の販売手数料（成果報酬） */}
      <h2 className="text-lg font-black">自社在庫の販売手数料（成果報酬）</h2>
      {sales.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">販売手数料の請求はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {sales.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {c.dealer?.name ?? '—'}
                    <span className="text-slate-500">{c.title ?? '車両販売'}</span>
                    <span className={`badge ${CHARGE_STATUS_CLS[c.status]}`}>{CHARGE_STATUS_LABEL[c.status]}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    成約 {formatYen(c.sale_amount)} ・ 料率 {Number(c.rate).toFixed(1)}% ・ {formatDateTime(c.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-navy-700">{formatYen(c.total)}</p>
                  <p className="text-[11px] text-slate-400">税抜 {formatYen(c.fee_amount)} + 税 {formatYen(c.tax)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {NEXT.map((n) => (
                  <form key={n.status} action={adminSetSaleCommissionStatus.bind(null, c.id, n.status)}>
                    <button
                      disabled={c.status === n.status}
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}
                    >
                      {n.label}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* マッチング手数料（案件） */}
      <h2 className="text-lg font-black">マッチング手数料（案件）</h2>
      {charges.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">手数料の請求はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {charges.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="font-mono text-xs text-slate-400">
                      CASE-{String(c.case?.case_no ?? 0).padStart(6, '0')}
                    </span>
                    {c.dealer?.name ?? '—'}
                    <span className={`badge ${CHARGE_STATUS_CLS[c.status]}`}>{CHARGE_STATUS_LABEL[c.status]}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.category}（{(c.fee_rate * 100).toFixed(1)}%） ・ 成約 {formatYen(c.base_amount)} ・ {formatDateTime(c.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-navy-700">{formatYen(c.total)}</p>
                  <p className="text-[11px] text-slate-400">税抜 {formatYen(c.fee_amount)} + 税 {formatYen(c.tax)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {NEXT.map((n) => (
                  <form key={n.status} action={adminSetChargeStatus.bind(null, c.id, n.status)}>
                    <button
                      disabled={c.status === n.status}
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}
                    >
                      {n.label}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
