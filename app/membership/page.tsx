import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Check, Clock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/settings';
import { formatYen } from '@/lib/format';
import { applyMembership, cancelMembership } from '@/app/membership/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '有料会員 | BUYMO ダイレクト' };

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/membership');

  const cfg = await getPricingConfig();
  const { data: prof } = await supabase.from('profiles').select('member_tier').eq('id', user.id).maybeSingle();
  const tier = (prof as { member_tier?: string } | null)?.member_tier ?? 'free';

  const { data: appRow } = await supabase
    .from('membership_applications')
    .select('status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const appStatus = (appRow as { status?: string } | null)?.status;

  const benefits = [
    '業販・仕入れ相場の詳細表示',
    'オンライン講座「買取を学ぶ」実践編',
    '買取コミュニティ（初心者も安心）',
    'プロ向けの限定情報・非公開データ',
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <div className="text-center">
        <Crown className="mx-auto h-10 w-10 text-gold-500" />
        <h1 className="mt-2 text-3xl font-black">有料会員</h1>
        <p className="mt-1 text-sm text-slate-600">買取（業販・仕入れ）と学びが、すべて見えるようになります。</p>
      </div>

      <div className="card p-6 text-center">
        <p className="text-xs font-bold text-slate-500">月額（税込）</p>
        <p className="text-4xl font-black text-navy-700">{formatYen(cfg.membershipMonthlyFee)}</p>
      </div>

      <div className="card p-6">
        <p className="font-black text-slate-700">有料会員でできること</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {benefits.map((b) => (
            <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{b}</li>
          ))}
        </ul>
      </div>

      {tier === 'paid' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /><span className="font-black">有料会員です</span>
          </div>
          <form action={cancelMembership}>
            <button className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">有料会員を解約する</button>
          </form>
        </div>
      ) : appStatus === 'pending' || sp.applied ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <Clock className="h-5 w-5" /><span className="font-black">お申し込みを受け付けました（審査中）</span>
        </div>
      ) : (
        <form action={applyMembership}>
          <button className="btn-accent w-full py-3">有料会員に申し込む</button>
          <p className="mt-2 text-center text-xs text-slate-400">※ 現在は本部承認制です。決済連携は順次対応します。</p>
        </form>
      )}

      <p className="text-center text-xs text-slate-400">
        まだ加盟していない方は <Link href="/join" className="font-bold text-navy-500 underline">加盟店・プロ登録（無料）</Link> もご検討ください。
      </p>
    </div>
  );
}
