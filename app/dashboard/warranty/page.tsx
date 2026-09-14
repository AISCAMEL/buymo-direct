import { redirect } from 'next/navigation';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { subscribeWarranty } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '延長保証 | BUYMO' };

const PLANS = [
  {
    id: 'basic',
    label: 'ベーシック',
    months: 3,
    price: 29800,
    recommended: false,
    items: ['エンジン（主要部品）', 'ミッション（主要部品）', '駆動系（主要部品）'],
  },
  {
    id: 'standard',
    label: 'スタンダード',
    months: 6,
    price: 49800,
    recommended: true,
    items: ['エンジン（全部品）', 'ミッション（全部品）', '駆動系', '電装系', 'エアコン'],
  },
  {
    id: 'premium',
    label: 'プレミアム',
    months: 12,
    price: 89800,
    recommended: false,
    items: ['全部位保証', '消耗品を除くすべての部品', '代車費用（最大5日）', '24時間ロードサービス'],
  },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: '保証有効', cls: 'bg-emerald-100 text-emerald-700' },
  expired: { label: '期限切れ', cls: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'キャンセル済み', cls: 'bg-red-100 text-red-600' },
};

const PLAN_LABEL: Record<string, string> = {
  basic: 'ベーシック 3ヶ月',
  standard: 'スタンダード 6ヶ月',
  premium: 'プレミアム 1年',
};

export default async function WarrantyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/warranty');

  const { data: subs } = await (supabase as any)
    .from('warranty_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeSub = (subs ?? []).find((s: any) => s.status === 'active');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-navy-400" />
        <h1 className="text-2xl font-black">延長保証</h1>
      </div>

      {activeSub && (
        <div className="card border-2 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className="font-black text-emerald-700">現在有効な保証</span>
          </div>
          <p className="font-bold">{PLAN_LABEL[activeSub.plan]}</p>
          <p className="text-sm text-slate-600">保証期間: {activeSub.starts_at} 〜 {activeSub.ends_at}</p>
          <p className="text-sm text-slate-600">ご購入金額: {formatYen(activeSub.price)}</p>
        </div>
      )}

      {/* Plan selection */}
      <div className="space-y-4">
        <h2 className="font-bold">プランを選ぶ</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map(plan => (
            <form key={plan.id} action={subscribeWarranty}>
              <input type="hidden" name="plan" value={plan.id} />
              <div className={`relative flex h-full flex-col rounded-2xl border-2 p-5 ${plan.recommended ? 'border-navy-500 bg-navy-50' : 'border-slate-200 bg-white'}`}>
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy-600 px-3 py-0.5 text-xs font-black text-white">おすすめ</span>
                )}
                <h3 className="font-black text-navy-800">{plan.label}</h3>
                <p className="text-xs text-slate-500">{plan.months}ヶ月間</p>
                <p className="mt-2 text-2xl font-black text-navy-700">{formatYen(plan.price)}</p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {plan.items.map(item => (
                    <li key={item} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button type="submit" className={`mt-4 w-full rounded-xl py-2 text-sm font-bold transition ${plan.recommended ? 'bg-navy-600 text-white hover:bg-navy-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  このプランに申込む
                </button>
              </div>
            </form>
          ))}
        </div>
        <p className="text-xs text-slate-400">※ 保証は申込日から開始されます。車検証コピーの提出が必要です。保証の詳細は申込後にメールでお送りします。</p>
      </div>

      {/* History */}
      {(subs ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold">保証履歴</h2>
          {(subs ?? []).map((s: any) => {
            const st = STATUS[s.status] ?? STATUS.expired;
            return (
              <div key={s.id} className="card flex items-center gap-4 p-4">
                <ShieldCheck className={`h-5 w-5 shrink-0 ${s.status === 'active' ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div className="flex-1">
                  <p className="font-bold">{PLAN_LABEL[s.plan]}</p>
                  <p className="text-sm text-slate-500">{s.starts_at} 〜 {s.ends_at} / {formatYen(s.price)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
