import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Landmark, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { LoanCalculator } from '@/components/LoanCalculator';
import { LoanScoreSimulator } from '@/components/LoanScoreSimulator';
import type { LoanApplication } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ローン仮審査 | BUYMO' };

const STATUS: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  submitted: { label: '受付済み', cls: 'bg-slate-200 text-slate-600', icon: Clock },
  reviewing: { label: '審査中', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '承認', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: '否決', cls: 'bg-red-100 text-red-700', icon: XCircle },
};

const FINANCE_COMPANIES = [
  { name: 'GMOクレジット', rate: '3.9%〜', time: '最短即日', feature: 'オンライン完結' },
  { name: 'ジャックス', rate: '4.2%〜', time: '1〜3営業日', feature: '長期ローン対応（最大84回）' },
  { name: 'アプラス', rate: '3.5%〜', time: '最短翌日', feature: '低金利プラン' },
];

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/loans');

  const { data } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('applicant_id', user.id)
    .order('created_at', { ascending: false });
  const apps = (data ?? []) as LoanApplication[];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-2">
        <Landmark className="h-6 w-6 text-navy-400" />
        <h1 className="text-2xl font-black">ローン仮審査</h1>
      </div>

      {/* Calculator */}
      <div className="card p-5">
        <LoanCalculator />
      </div>

      {/* Loan Score Simulator */}
      <div className="card p-5">
        <LoanScoreSimulator />
      </div>

      {/* Finance companies */}
      <div className="card p-5">
        <h2 className="mb-4 font-bold">提携金融機関</h2>
        <div className="divide-y divide-slate-100">
          {FINANCE_COMPANIES.map(fc => (
            <div key={fc.name} className="flex items-center gap-4 py-3 text-sm">
              <div className="flex h-10 w-24 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                {fc.name}
              </div>
              <div className="flex-1">
                <p className="font-bold">{fc.name}</p>
                <p className="text-slate-500">{fc.feature}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-navy-700">{fc.rate}</p>
                <p className="text-xs text-slate-400">{fc.time}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          仮審査は気になる車両の詳細ページから申し込めます。
          <Link href="/listings" className="ml-1 font-bold text-navy-600 hover:underline">車を探す →</Link>
        </p>
      </div>

      {/* Applications */}
      <div>
        <h2 className="mb-3 font-bold">申込履歴</h2>
        {apps.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500">
            申込はまだありません。気になる車両の詳細から仮審査を申し込めます。
            <div className="mt-4">
              <Link href="/listings" className="btn-primary">車を探す</Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {apps.map((a) => {
              const s = STATUS[a.status] ?? STATUS.submitted;
              const Icon = s.icon;
              return (
                <li key={a.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-navy-800">{formatYen(a.vehicle_price)}</p>
                      <p className="text-sm text-slate-500">
                        頭金 {formatYen(a.down_payment)} / {a.term_months}回払い
                        {a.est_monthly ? ` / 月々 ${formatYen(a.est_monthly)}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">申込日 {formatDate(a.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Icon className="h-4 w-4" />
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                  {a.status === 'approved' && (
                    <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                      <p className="font-bold text-emerald-700">審査が承認されました。</p>
                      <p className="text-emerald-600">購入手続きに進んでください。</p>
                    </div>
                  )}
                  {a.status === 'rejected' && (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm">
                      <p className="font-bold text-red-700">今回は見送りとなりました。</p>
                      <p className="text-red-600">別の金融機関へ再申請できます。</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
