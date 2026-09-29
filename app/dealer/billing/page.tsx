import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDateTime, formatDate } from '@/lib/format';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_CLS, type ChargeStatus } from '@/lib/matching-fee';
import { STATEMENT_STATUS_LABEL, STATEMENT_STATUS_CLS, formatStatementNo, type StatementStatus } from '@/lib/fee-statement';

export const dynamic = 'force-dynamic';

type ChargeRow = {
  id: string; case_id: string; category: string | null;
  base_amount: number; fee_rate: number; fee_amount: number; tax: number; total: number;
  status: ChargeStatus; created_at: string;
  case?: { case_no: number; type: string; title: string | null } | null;
};

type SaleRow = {
  id: string; title: string | null; sale_amount: number; rate: number;
  fee_amount: number; tax: number; total: number; status: ChargeStatus; created_at: string;
};

export default async function DealerBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/billing');

  const { data: dealer } = await supabase.from('dealers').select('id').eq('owner_id', user.id).maybeSingle();
  if (!dealer) redirect('/dealer/register');

  const dealerId = (dealer as { id: string }).id;
  const [{ data }, { data: saleData }, { data: stmtData }] = await Promise.all([
    supabase
      .from('case_charges')
      .select('id, case_id, category, base_amount, fee_rate, fee_amount, tax, total, status, created_at, case:cases!case_charges_case_id_fkey(case_no, type, title)')
      .eq('partner_id', dealerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sale_commissions')
      .select('id, title, sale_amount, rate, fee_amount, tax, total, status, created_at')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('fee_statements')
      .select('id, statement_no, period_end, total, status, due_date, created_at')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false }),
  ]);
  const charges = (data ?? []) as unknown as ChargeRow[];
  const sales = (saleData ?? []) as unknown as SaleRow[];
  const statements = (stmtData ?? []) as unknown as { id: string; statement_no: number; period_end: string; total: number; status: StatementStatus; due_date: string | null }[];

  const isUnpaid = (s: string) => s === 'pending' || s === 'invoiced';
  const unpaidTotal =
    charges.filter((c) => isUnpaid(c.status)).reduce((s, c) => s + (c.total ?? 0), 0) +
    sales.filter((c) => isUnpaid(c.status)).reduce((s, c) => s + (c.total ?? 0), 0);
  const paidTotal =
    charges.filter((c) => c.status === 'paid').reduce((s, c) => s + (c.total ?? 0), 0) +
    sales.filter((c) => c.status === 'paid').reduce((s, c) => s + (c.total ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Receipt className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">手数料・請求</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xl font-black text-amber-600">{formatYen(unpaidTotal)}</p>
          <p className="text-xs text-slate-500">お支払い予定</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-black text-emerald-600">{formatYen(paidTotal)}</p>
          <p className="text-xs text-slate-500">お支払い済み</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-black text-slate-700">{charges.length + sales.length}</p>
          <p className="text-xs text-slate-500">請求件数</p>
        </div>
      </div>

      {/* 締め請求（手数料の合算請求） */}
      {statements.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-black">締め請求（手数料のご請求）</h2>
          <p className="text-xs text-slate-500">締め日ごとに手数料をまとめた請求です。明細・印刷は各請求から確認できます。</p>
          <ul className="space-y-2">
            {statements.map((st) => (
              <li key={st.id}>
                <Link href={`/dealer/statements/${st.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-md">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <span className="font-mono text-xs text-slate-400">{formatStatementNo(st.statement_no)}</span>
                      締め日 {formatDate(st.period_end)}
                      <span className={`badge ${STATEMENT_STATUS_CLS[st.status]}`}>{STATEMENT_STATUS_LABEL[st.status]}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">お支払い期限 {formatDate(st.due_date ?? st.period_end)}</p>
                  </div>
                  <p className="text-lg font-black text-navy-700">{formatYen(st.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 自社在庫の販売手数料（成果報酬） */}
      <section className="space-y-2">
        <h2 className="text-lg font-black">自社在庫の販売手数料（成果報酬）</h2>
        <p className="text-xs text-slate-500">
          自社で出品した車両が売れると、契約料率（業販レート）に応じた成果報酬が発生します。
        </p>
        {sales.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">販売手数料の請求はまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {sales.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {c.title ?? '車両販売'}
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* マッチング手数料（案件） */}
      <section className="space-y-2">
        <h2 className="text-lg font-black">マッチング手数料（案件）</h2>
        <p className="text-xs text-slate-500">
          BUYMO経由で成立した案件には、サービス種別に応じたマッチング手数料が発生します。
        </p>
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
                      {c.case?.title ?? c.category ?? '案件'}
                      <span className={`badge ${CHARGE_STATUS_CLS[c.status]}`}>{CHARGE_STATUS_LABEL[c.status]}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.category}（料率 {(c.fee_rate * 100).toFixed(1)}%） ・ 成約 {formatYen(c.base_amount)} ・ {formatDateTime(c.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-navy-700">{formatYen(c.total)}</p>
                    <p className="text-[11px] text-slate-400">税抜 {formatYen(c.fee_amount)} + 税 {formatYen(c.tax)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
        お支払い方法・締め日については本部からのご案内をご確認ください。
      </div>
    </div>
  );
}
