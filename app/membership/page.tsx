import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Check, Clock, CheckCircle2, X } from 'lucide-react';
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

  const pains = [
    '相場が分からず、買取価格を“勘”で決めている',
    '買い負け・買い過ぎで利益を落としている',
    '仕入れの数が伸びない／相談できる相手がいない',
  ];
  const gains = [
    { t: '仕入れ判断が速くなる', d: '業販・仕入れ相場をその場で確認。買取額の根拠が持てます。' },
    { t: '利益を取りこぼさない', d: '相場の目安で買い負け・買い過ぎを防止。1台あたりの利益を底上げ。' },
    { t: '学んで伸ばせる', d: '実践講座「買取を学ぶ」で査定・相場・法令まで体系的に。' },
    { t: 'ひとりで悩まない', d: '買取コミュニティで先輩や運営に相談。初心者も安心。' },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <div className="text-center">
        <Crown className="mx-auto h-10 w-10 text-gold-500" />
        <h1 className="mt-2 text-3xl font-black leading-tight">買取で、<span className="text-gold-600">もっと利益を。</span></h1>
        <p className="mt-2 text-sm text-slate-600">
          無料のままでは<strong>買取の相場も、仕入れの勝ち筋も見えません</strong>。
          有料会員なら、プロの買取に必要な情報・学び・仲間がすべて手に入ります。
        </p>
      </div>

      {/* 共感（ペイン） */}
      <div className="card p-5">
        <p className="font-black text-slate-800">こんな悩み、ありませんか？</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          {pains.map((p) => (
            <li key={p} className="flex gap-2"><span className="mt-0.5 shrink-0 text-slate-300">✓</span>{p}</li>
          ))}
        </ul>
      </div>

      {/* 価格 */}
      <div className="card p-6 text-center">
        <p className="text-xs font-bold text-slate-500">月額（税込）</p>
        <p className="text-4xl font-black text-navy-700">{formatYen(cfg.membershipMonthlyFee)}</p>
        <p className="mt-1 text-xs text-slate-400">1台の買取で十分にペイする価格設定です。</p>
      </div>

      {/* 価値（ゲイン） */}
      <div className="card p-6">
        <p className="font-black text-slate-700">有料会員で、こう変わります</p>
        <ul className="mt-3 space-y-3">
          {gains.map((g) => (
            <li key={g.t} className="flex gap-2.5">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-bold text-slate-800">{g.t}</p>
                <p className="text-sm text-slate-500">{g.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 無料 vs 有料 比較表 */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <p className="font-black text-slate-700">無料会員と有料会員のちがい</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500">
              <th className="px-4 py-2 text-left font-medium">できること</th>
              <th className="w-16 px-2 py-2 text-center font-medium">無料</th>
              <th className="w-16 px-2 py-2 text-center font-bold text-gold-700">有料</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              { label: '車の売買・出品', free: true },
              { label: 'スキル提供・案件の受注', free: true },
              { label: '車を探す・問い合わせ・チャット', free: true },
              { label: '本人確認', free: true },
              { label: '買取の相場・仕入れ情報', free: false },
              { label: 'オンライン講座「買取を学ぶ」実践編', free: false },
              { label: '買取コミュニティ', free: false },
              { label: 'プロ向けの限定情報・非公開データ', free: false },
            ].map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-2.5 text-slate-700">{r.label}</td>
                <td className="px-2 py-2.5 text-center">
                  {r.free ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-slate-300" />}
                </td>
                <td className="bg-gold-50/40 px-2 py-2.5 text-center">
                  <Check className="mx-auto h-4 w-4 text-gold-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <button className="btn-accent w-full py-3.5 text-base">いますぐ有料会員になる</button>
          <p className="mt-2 text-center text-xs text-slate-400">※ 現在は本部承認制です。決済連携は順次対応します。いつでも解約できます。</p>
        </form>
      )}

      <p className="text-center text-xs text-slate-400">
        まだ加盟していない方は <Link href="/join" className="font-bold text-navy-500 underline">加盟店・プロ登録（無料）</Link> もご検討ください。
      </p>
    </div>
  );
}
