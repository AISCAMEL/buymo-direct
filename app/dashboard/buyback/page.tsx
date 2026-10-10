import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { formatYen } from '@/lib/format';
import { buybackPriceOf, guaranteeUntil, guaranteeStatus, GUARANTEE_DAYS } from '@/lib/buyback';
import { redeemBuyback, extendGuarantee, optOutGuarantee, resumeGuarantee } from './actions';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '申請中', cls: 'bg-amber-100 text-amber-700' },
  in_review: { label: '審査中', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: '承認（買取確定）', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '買取完了', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '見送り', cls: 'bg-slate-100 text-slate-500' },
};

export default async function BuybackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/buyback');

  const isDealer = (await getDealerForUser(user.id)) !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-gold-500" />
        <h1 className="text-2xl font-black">買取保証</h1>
      </div>

      {isDealer ? (
        <div className="card p-6 text-sm text-slate-600">
          <p className="font-bold text-slate-800">買取保証は個人会員さま向けのサービスです。</p>
          <p className="mt-1">加盟店の出品は買取保証の対象外となります。加盟店の販売・在庫管理は「加盟店管理」からご利用ください。</p>
          <Link href="/dealer/dashboard" className="btn-primary mt-4 inline-flex">加盟店管理へ</Link>
        </div>
      ) : (
        <BuybackForIndividual userId={user.id} />
      )}
    </div>
  );
}

async function BuybackForIndividual({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [{ data: listings }, { data: reqRows }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, maker, model, year, mileage_km, price, ai_price_min, ai_price_max, status, created_at, guarantee_until, guarantee_opt_out')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('buyback_requests')
      .select('id, listing_id, maker, model, year, buyback_price, status, rejection_reason, created_at, transport_fee, payout_amount')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const requests = reqRows ?? [];
  const lockedListingIds = new Set(
    requests.filter((r) => ['pending', 'in_review', 'approved', 'completed'].includes(r.status)).map((r) => r.listing_id),
  );

  const now = Date.now();
  type Row = {
    id: string; maker: string; model: string; year: number; price: number;
    buybackPrice: number; until: Date; daysLeft: number; state: 'active' | 'expiring' | 'expired'; optedOut: boolean;
  };
  const rows: Row[] = (listings ?? [])
    .filter((l) => l.status === 'active' && !lockedListingIds.has(l.id))
    .map((l) => {
      const aiMin = l.ai_price_min ?? l.price;
      const aiMax = l.ai_price_max ?? l.price;
      const until = guaranteeUntil(l.created_at, l.guarantee_until ?? null);
      const { daysLeft, state } = guaranteeStatus(until, now);
      return {
        id: l.id, maker: l.maker, model: l.model, year: l.year, price: l.price,
        buybackPrice: buybackPriceOf(aiMin, aiMax), until, daysLeft, state,
        optedOut: !!l.guarantee_opt_out,
      };
    });

  const reminders = rows.filter((r) => !r.optedOut && (r.state === 'expiring' || r.state === 'expired'));
  const active = rows.filter((r) => !r.optedOut && r.state === 'active');
  const optedOut = rows.filter((r) => r.optedOut);

  return (
    <>
      <div className="card p-5 text-sm text-slate-600">
        <p className="font-bold text-slate-800">あなたの出品には買取保証が付いています。</p>
        <p className="mt-1">
          出品から{GUARANTEE_DAYS}日以内に売れなかった場合、BUYMOが買取保証価格で買い取ります。
          買取保証は出品ページには表示されず、このマイページ内でのみ管理できます。
        </p>
      </div>

      {/* 期限が近い／到来：リマインダー */}
      {reminders.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-black text-amber-700">
            <AlertTriangle className="h-5 w-5" /> 保証期間の確認をお願いします
          </h2>
          {reminders.map((r) => (
            <div key={r.id} className="card border-amber-200 p-4">
              <p className="font-bold">{r.year}年 {r.maker} {r.model}</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {r.state === 'expired'
                  ? `買取保証の期間（${fmtDate(r.until)}）が過ぎました。`
                  : `買取保証の期限まであと ${r.daysLeft} 日（${fmtDate(r.until)}）です。`}
              </p>
              <p className="mt-1 text-sm">
                買取保証価格: <span className="font-black text-navy-700">{formatYen(r.buybackPrice)}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">どうされますか？</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={extendGuarantee.bind(null, r.id)}>
                  <button className="rounded-md border border-navy-300 px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-50">
                    出品を延長する（+{GUARANTEE_DAYS}日）
                  </button>
                </form>
                <form action={redeemBuyback.bind(null, r.id)}>
                  <button className="rounded-md bg-gold-500 px-3 py-1.5 text-xs font-black text-[#2E2408] hover:bg-gold-600">
                    買取保証で買い取ってもらう
                  </button>
                </form>
                <form action={optOutGuarantee.bind(null, r.id)}>
                  <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
                    買取保証をやめる
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 有効な保証 */}
      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Clock className="h-5 w-5 text-emerald-500" /> 保証期間中の出品
          </h2>
          {active.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{r.year}年 {r.maker} {r.model}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    残り {r.daysLeft} 日（期限 {fmtDate(r.until)}） ・ 買取保証価格 {formatYen(r.buybackPrice)}
                  </p>
                </div>
                <span className="badge bg-emerald-100 text-emerald-700">保証中</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 辞退中 */}
      {optedOut.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-black text-slate-500">買取保証を辞退中</h2>
          {optedOut.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-600">{r.year}年 {r.maker} {r.model}</p>
                <form action={resumeGuarantee.bind(null, r.id)}>
                  <button className="rounded-md border border-navy-300 px-3 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-50">
                    買取保証を再開する
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 申請履歴 */}
      {requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-black">買取申請の状況</h2>
          {requests.map((r) => {
            const s = REQ_STATUS[r.status] ?? REQ_STATUS.pending;
            const Icon = r.status === 'rejected' ? XCircle : r.status === 'completed' || r.status === 'approved' ? CheckCircle2 : Clock;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{r.year}年 {r.maker} {r.model}</p>
                    <p className="mt-0.5 text-sm text-slate-500">買取保証価格 {formatYen(r.buyback_price)}</p>
                    {(r as { transport_fee?: number | null }).transport_fee ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        陸送費 −{formatYen((r as { transport_fee?: number | null }).transport_fee ?? 0)}
                        {typeof (r as { payout_amount?: number | null }).payout_amount === 'number' && (
                          <> ・ 実支払額 <span className="font-black text-emerald-600">{formatYen((r as { payout_amount?: number | null }).payout_amount ?? 0)}</span></>
                        )}
                      </p>
                    ) : null}
                    {r.rejection_reason && <p className="mt-0.5 text-xs text-red-500">理由: {r.rejection_reason}</p>}
                  </div>
                  <span className={`badge flex items-center gap-1 ${s.cls}`}><Icon className="h-3 w-3" />{s.label}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {reminders.length === 0 && active.length === 0 && optedOut.length === 0 && requests.length === 0 && (
        <p className="card p-8 text-center text-sm text-slate-500">
          現在、買取保証の対象となる出品はありません。車を出品すると、ここに買取保証の状況が表示されます。
        </p>
      )}
    </>
  );
}
