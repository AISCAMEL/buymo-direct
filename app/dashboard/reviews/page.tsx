import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Star, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RatingStars } from '@/components/RatingStars';
import { formatDate, formatYen } from '@/lib/format';
import type { ReviewWithReviewer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ReviewsDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/reviews');

  // 受け取った評価
  const { data: reviewRows } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, display_name)')
    .eq('reviewee_id', user.id)
    .order('created_at', { ascending: false });
  const reviews = (reviewRows ?? []) as unknown as ReviewWithReviewer[];

  // 評価統計
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));

  // 評価待ち取引（completed だが自分がまだ評価していない）
  const { data: escrowRows } = await supabase
    .from('escrow_transactions')
    .select('id, amount, updated_at, buyer_id, seller_id, listings(title, maker, model), buyer:profiles!escrow_transactions_buyer_id_fkey(id, display_name), seller:profiles!escrow_transactions_seller_id_fkey(id, display_name)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false });

  // 自分が投稿した評価の escrow_id セット
  const { data: myReviewRows } = await supabase
    .from('reviews')
    .select('escrow_id')
    .eq('reviewer_id', user.id);
  const reviewedEscrowIds = new Set((myReviewRows ?? []).map((r) => r.escrow_id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingEscrows = (escrowRows ?? []).filter((e: any) => !reviewedEscrowIds.has(e.id));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">評価・レビュー</h1>

      {/* ── 評価サマリー ── */}
      <section className="card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* 平均スコア */}
          <div className="text-center sm:w-36">
            <p className="text-5xl font-black text-slate-800">
              {count ? avg.toFixed(1) : '—'}
            </p>
            <RatingStars value={avg} className="mt-1 justify-center" />
            <p className="mt-1 text-sm text-slate-500">{count} 件の評価</p>
          </div>

          {/* 星別バー */}
          {count > 0 && (
            <div className="flex-1 space-y-1.5">
              {breakdown.map(({ star, n }) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-right font-bold text-slate-600">{star}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: count ? `${(n / count) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-6 text-right text-slate-400">{n}</span>
                </div>
              ))}
            </div>
          )}

          {count === 0 && (
            <p className="flex-1 text-sm text-slate-500">
              取引完了後に相手から評価が届きます。
            </p>
          )}
        </div>
      </section>

      {/* ── 評価待ちの取引 ── */}
      {pendingEscrows.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-black">
            評価を送りましょう
            <span className="ml-2 rounded-full bg-accent-500 px-2.5 py-0.5 text-sm text-white">
              {pendingEscrows.length}
            </span>
          </h2>
          <ul className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pendingEscrows.map((e: any) => {
              const isBuyer = e.buyer_id === user.id;
              const counterparty = isBuyer ? e.seller : e.buyer;
              const listing = e.listings;
              return (
                <li key={e.id} className="card flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {listing?.maker} {listing?.model}「{listing?.title}」
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatYen(e.amount)} ・ 取引完了 {formatDate(e.updated_at)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {counterparty?.display_name ?? '取引相手'} さんをまだ評価していません
                    </p>
                  </div>
                  <Link
                    href={`/escrow/${e.id}`}
                    className="btn-accent shrink-0 whitespace-nowrap"
                  >
                    <Star className="h-4 w-4" /> 評価する
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── 受け取った評価 ── */}
      <section>
        <h2 className="mb-3 text-lg font-black">受け取った評価（{count}件）</h2>
        {reviews.length > 0 ? (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {(r.reviewer?.display_name ?? '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{r.reviewer?.display_name ?? '匿名'}</p>
                      <RatingStars value={r.rating} />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center text-sm text-slate-500">
            まだ評価はありません。取引完了後に相手から届きます。
          </div>
        )}
      </section>
    </div>
  );
}
