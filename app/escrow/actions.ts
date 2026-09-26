'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ESCROW_FEE, TITLE_OPTIONS, installmentFeeFor } from '@/lib/constants';
import { createSquarePayment, refundSquarePayment, isSquareConfigured } from '@/lib/square';
import type { EscrowStatus, TitleTransferOption, PaymentMethod } from '@/lib/types';
import { dispatchWebhook } from '@/lib/dealer';
import { sendPaymentConfirmedEmail, sendDealCompletedEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

/** 会話からエスクロー取引を作成（買主のみ）。出品は「商談中」に更新。 */
export async function createEscrow(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/messages/${conversationId}`);

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, listings(price, status)')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv || conv.buyer_id !== user.id) redirect(`/messages/${conversationId}`);

  // 既存があればそこへ
  const { data: existing } = await supabase
    .from('escrow_transactions')
    .select('id')
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (existing) redirect(`/escrow/${existing.id}`);

  const price = (conv as any).listings?.price ?? 0;
  const { data: created, error } = await supabase
    .from('escrow_transactions')
    .insert({
      listing_id: conv.listing_id,
      conversation_id: conversationId,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      amount: price,
      escrow_fee: ESCROW_FEE,
      title_option: 'standard',
      title_fee: TITLE_OPTIONS.standard.fee,
      status: 'initiated',
    })
    .select('id')
    .single();
  if (error || !created) redirect(`/messages/${conversationId}?error=escrow`);

  await supabase.from('listings').update({ status: 'reserved' }).eq('id', conv.listing_id);
  redirect(`/escrow/${created.id}`);
}

const ORDER: EscrowStatus[] = ['initiated', 'funds_held', 'inspection', 'title_transfer', 'completed'];

/** ステップを1つ進める（当事者のみ）。完了時は出品を sold に更新。 */
export async function advanceEscrow(escrowId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('id, status, listing_id, buyer_id, seller_id, amount')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || (tx.buyer_id !== user.id && tx.seller_id !== user.id)) redirect('/messages');

  const idx = ORDER.indexOf(tx.status as EscrowStatus);
  if (idx < 0 || idx >= ORDER.length - 1) return;
  const next = ORDER[idx + 1];

  await supabase.from('escrow_transactions').update({ status: next }).eq('id', escrowId);
  if (next === 'completed') {
    await supabase.from('listings').update({ status: 'sold' }).eq('id', tx.listing_id);

    // Dispatch webhook if listing belongs to a dealer
    const { data: listing } = await supabase
      .from('listings')
      .select('dealer_id, title, price')
      .eq('id', tx.listing_id)
      .maybeSingle();
    if (listing?.dealer_id) {
      dispatchWebhook(listing.dealer_id, 'deal.completed', {
        escrow_id: escrowId,
        listing_id: tx.listing_id,
        title: listing.title,
        amount: tx.amount,
        buyer_id: tx.buyer_id,
        seller_id: tx.seller_id,
      }).catch(() => {/* fire-and-forget */});
    }

    // 取引完了メール + 通知（fire-and-forget。失敗はメインフローに影響しない）
    const listingTitle = listing?.title ?? '';
    ;(async () => {
      try {
        const svc = createServiceClient();
        const [buyerRes, sellerRes] = await Promise.all([
          svc.auth.admin.getUserById(tx.buyer_id),
          svc.auth.admin.getUserById(tx.seller_id),
        ]);
        const buyerEmail = buyerRes.data?.user?.email;
        const sellerEmail = sellerRes.data?.user?.email;
        if (buyerEmail) {
          await sendDealCompletedEmail(buyerEmail, { listingTitle, amount: tx.amount, escrowId, role: 'buyer' });
        }
        if (sellerEmail) {
          await sendDealCompletedEmail(sellerEmail, { listingTitle, amount: tx.amount, escrowId, role: 'seller' });
        }
        // 買主・売主両方への取引完了通知
        await Promise.all([
          createNotification(
            tx.buyer_id,
            'escrow',
            '取引が完了しました',
            `「${listingTitle}」の取引が完了しました。`,
            `/escrow/${escrowId}`
          ),
          createNotification(
            tx.seller_id,
            'escrow',
            '取引が完了しました',
            `「${listingTitle}」の取引が完了しました。`,
            `/escrow/${escrowId}`
          ),
        ]);
      } catch { /* メール・通知送信失敗は無視 */ }
    })().catch(() => {});
  }
  revalidatePath(`/escrow/${escrowId}`);
}

/** 名義変更オプションを変更（取引開始前のみ）。 */
export async function setTitleOption(escrowId: string, option: TitleTransferOption) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('escrow_transactions')
    .update({ title_option: option, title_fee: TITLE_OPTIONS[option].fee })
    .eq('id', escrowId)
    .eq('status', 'initiated');
  revalidatePath(`/escrow/${escrowId}`);
}

/** 支払い方法を選択（取引開始前のみ）。クレジット時は分割手数料(4.2%)を再計算。 */
export async function setPaymentMethod(escrowId: string, method: PaymentMethod) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('amount, escrow_fee, title_fee, buyer_id, status')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || tx.buyer_id !== user.id || tx.status !== 'initiated') return;

  const subtotal = tx.amount + tx.escrow_fee + tx.title_fee;
  await supabase
    .from('escrow_transactions')
    .update({ payment_method: method, installment_fee: installmentFeeFor(method, subtotal) })
    .eq('id', escrowId)
    .eq('status', 'initiated');
  revalidatePath(`/escrow/${escrowId}`);
}

/**
 * 入金確定（買主・initiated のみ）。クレジットは Square で決済、
 * 現金/ローンは記録のみ。成功で status=funds_held。
 */
export async function confirmEscrowPayment(
  escrowId: string,
  sourceId?: string,
  couponId?: string | null,
  couponDiscount?: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('id, amount, escrow_fee, title_fee, payment_method, buyer_id, seller_id, listing_id, status')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || tx.buyer_id !== user.id) return { error: '権限がありません' };
  if (tx.status !== 'initiated') return { error: 'この取引はすでに入金済みです' };
  const method = tx.payment_method as PaymentMethod | null;
  if (!method) return { error: '支払い方法を選択してください' };

  const subtotal = tx.amount + tx.escrow_fee + tx.title_fee;
  const installment = installmentFeeFor(method, subtotal);
  const total = subtotal + installment;

  let squarePaymentId: string | null = null;

  if (method === 'credit') {
    if (isSquareConfigured()) {
      if (!sourceId) return { error: 'カード情報が確認できませんでした' };
      const result = await createSquarePayment({
        sourceId,
        amountYen: total,
        idempotencyKey: `pay-${escrowId}`,
        note: `BUYMO ダイレクト escrow ${escrowId}`,
      });
      if (!result.ok) return { error: `決済に失敗しました：${result.error ?? ''}` };
      squarePaymentId = result.paymentId ?? null;
    } else if (process.env.NODE_ENV === 'production') {
      // 本番で決済未設定なら無課金確定を拒否（デモ合格の無効化）
      return { error: '決済サービスが未設定のため、現在お支払いを受け付けられません。運営までお問い合わせください。' };
    }
    // 開発時のみ Square 未設定でデモ（無課金）続行
  }

  const discount = couponDiscount ?? 0;
  const { error } = await supabase
    .from('escrow_transactions')
    .update({
      status: 'funds_held',
      installment_fee: installment,
      square_payment_id: squarePaymentId,
      coupon_discount: discount,
    })
    .eq('id', escrowId)
    .eq('status', 'initiated');
  if (error) return { error: error.message };

  // 入金確認メール + 通知（fire-and-forget。失敗はメインフローに影響しない）
  ;(async () => {
    try {
      const svc = createServiceClient();
      const [listingRes, buyerRes, sellerRes] = await Promise.all([
        supabase.from('listings').select('title').eq('id', tx.listing_id).maybeSingle(),
        svc.auth.admin.getUserById(tx.buyer_id),
        svc.auth.admin.getUserById(tx.seller_id),
      ]);
      const listingTitle = (listingRes.data as { title?: string } | null)?.title ?? '';
      const buyerEmail = buyerRes.data?.user?.email;
      const sellerEmail = sellerRes.data?.user?.email;
      if (buyerEmail) {
        await sendPaymentConfirmedEmail(buyerEmail, { listingTitle, amount: tx.amount, escrowId, role: 'buyer' });
      }
      if (sellerEmail) {
        await sendPaymentConfirmedEmail(sellerEmail, { listingTitle, amount: tx.amount, escrowId, role: 'seller' });
      }
      // 売主への入金確認通知
      await createNotification(
        tx.seller_id,
        'escrow',
        '入金を確認しました',
        `「${listingTitle}」の入金が確認されました。取引を進めてください。`,
        `/escrow/${escrowId}`
      );
    } catch { /* メール・通知送信失敗は無視 */ }
  })().catch(() => {});

  // クーポン利用記録
  if (couponId && discount > 0) {
    await supabase.from('coupon_uses').insert({
      coupon_id: couponId,
      user_id: user.id,
      escrow_id: escrowId,
      discount,
    });
    // used_count をインクリメント
    const { data: c } = await supabase.from('coupons').select('used_count').eq('id', couponId).maybeSingle();
    if (c) {
      await supabase.from('coupons').update({ used_count: (c as { used_count: number }).used_count + 1 }).eq('id', couponId);
    }
  }

  revalidatePath(`/escrow/${escrowId}`);
  return { error: null };
}

/** 完了取引について取引相手を評価。RLS で完了済み・当事者のみ許可。 */
export async function submitReview(
  escrowId: string,
  revieweeId: string,
  rating: number,
  comment: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };
  if (rating < 1 || rating > 5) return { error: '評価は1〜5で入力してください' };

  const { error } = await supabase.from('reviews').insert({
    escrow_id: escrowId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/escrow/${escrowId}`);
  return { error: null };
}

/** 取引をキャンセル（initiated / funds_held のみ）。出品は active に戻す。入金済みクレジットは返金。 */
export async function cancelEscrow(escrowId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('status, listing_id, buyer_id, seller_id, payment_method, square_payment_id, amount, escrow_fee, title_fee, installment_fee')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || (tx.buyer_id !== user.id && tx.seller_id !== user.id)) redirect('/messages');
  if (tx.status !== 'initiated' && tx.status !== 'funds_held') return;

  // クレジット決済済みの場合は Square に返金リクエスト（fire-and-forget）
  if (tx.status === 'funds_held' && tx.payment_method === 'credit' && tx.square_payment_id && isSquareConfigured()) {
    const totalYen = tx.amount + tx.escrow_fee + tx.title_fee + tx.installment_fee;
    refundSquarePayment({
      paymentId: tx.square_payment_id,
      amountYen: totalYen,
      idempotencyKey: `refund-cancel-${escrowId}`,
      reason: 'エスクロー取引キャンセルによる返金',
    }).catch(() => {/* 返金失敗はログのみ（要運用対応）*/});
  }

  await supabase.from('escrow_transactions').update({ status: 'cancelled' }).eq('id', escrowId);
  await supabase.from('listings').update({ status: 'active' }).eq('id', tx.listing_id);
  revalidatePath(`/escrow/${escrowId}`);
}
