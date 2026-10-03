import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, CheckCircle2, Clock, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { getPricingConfig } from '@/lib/settings';
import { formatYen } from '@/lib/format';
import { BusinessOnlyGate } from '@/components/BusinessOnlyGate';
import { FranchiseApplyForm } from '@/components/FranchiseApplyForm';
import { FRANCHISE_STATUS_LABEL, FRANCHISE_STATUS_CLS, PAYMENT_METHOD_LABEL } from '@/lib/franchise';

export const dynamic = 'force-dynamic';
export const metadata = { title: '買取加盟のご案内 | BUYMO ダイレクト' };

export default async function FranchisePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/franchise');

  const access = await getViewerAccess();
  // 個人には提供しない（まず業者登録へ）
  if (!access.businessTrack) return <BusinessOnlyGate feature="買取加盟" source="franchise" />;
  // すでに加盟店
  if (access.isDealer) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="text-2xl font-black">すでに買取加盟店です</h1>
        <p className="text-sm text-slate-600">加盟店管理から案件・在庫・手数料をご確認いただけます。</p>
        <Link href="/dealer/dashboard" className="btn-accent inline-flex">加盟店ダッシュボードへ</Link>
      </div>
    );
  }

  const cfg = await getPricingConfig();
  const { data: appRow } = await supabase
    .from('franchise_applications')
    .select('status, payment_method, total, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const app = appRow as { status?: string; payment_method?: string; total?: number } | null;
  const pct = `${(cfg.squareSurchargeRate * 100).toFixed(1)}%`;

  const benefits = [
    { icon: TrendingUp, t: '買取で利益を出す仕組み', d: '相場・仕入れ・査定のノウハウと、出品〜決算までの導線。' },
    { icon: ShieldCheck, t: '安心のサポート', d: 'エスクロー・名義変更・保証まで本部が後方支援。' },
    { icon: Users, t: 'コミュニティと学び', d: '買取コミュニティ・実践講座で初心者も伴走。' },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <div className="text-center">
        <Building2 className="mx-auto h-10 w-10 text-gold-500" />
        <h1 className="mt-2 text-3xl font-black">買取加盟のご案内</h1>
        <p className="mt-2 text-sm text-slate-600">BUYMO の買取加盟店として、買取ビジネスを始めませんか。</p>
      </div>

      {/* 加盟中/申込中の状態 */}
      {app && app.status && app.status !== 'rejected' && app.status !== 'cancelled' ? (
        <div className="card space-y-2 p-6 text-center">
          <span className={`badge ${FRANCHISE_STATUS_CLS[app.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {FRANCHISE_STATUS_LABEL[app.status] ?? app.status}
          </span>
          <p className="flex items-center justify-center gap-2 text-lg font-black">
            <Clock className="h-5 w-5 text-amber-500" /> お申し込みを受け付けました
          </p>
          <p className="text-sm text-slate-500">
            お支払い方法：{PAYMENT_METHOD_LABEL[app.payment_method as 'invoice' | 'card'] ?? app.payment_method}／
            請求総額：{formatYen(app.total ?? 0)}
          </p>
          <p className="text-xs text-slate-400">本部より請求・お手続きのご案内をします。今しばらくお待ちください。</p>
        </div>
      ) : (
        <>
          {/* 価格 */}
          <div className="card p-6 text-center">
            <p className="text-xs font-bold text-slate-500">買取加盟金（初回のみ）</p>
            <p className="text-4xl font-black text-navy-700">{formatYen(cfg.joiningFee)}</p>
            <p className="mt-1 text-xs text-slate-400">＋ 加盟後の月会費 {formatYen(cfg.membershipMonthlyFee)}（税込）</p>
          </div>

          {/* ベネフィット */}
          <div className="card p-6">
            <p className="font-black text-slate-700">加盟でできること</p>
            <ul className="mt-3 space-y-3">
              {benefits.map((b) => (
                <li key={b.t} className="flex gap-2.5">
                  <b.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                  <div><p className="font-bold text-slate-800">{b.t}</p><p className="text-sm text-slate-500">{b.d}</p></div>
                </li>
              ))}
            </ul>
          </div>

          {/* 申込フォーム */}
          <div className="card p-6">
            <p className="mb-4 font-black text-slate-700">加盟を申し込む</p>
            <FranchiseApplyForm
              joiningFee={cfg.joiningFee}
              surchargeRate={cfg.squareSurchargeRate}
              surchargePercentLabel={pct}
            />
          </div>
        </>
      )}
    </div>
  );
}
