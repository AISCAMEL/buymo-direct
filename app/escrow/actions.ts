'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { TITLE_OPTIONS, installmentFeeFor, INSTALLMENT_FEE, isCardAllowed, CARD_MAX_YEN } from '@/lib/constants';
import { escrowFee, loanFee } from '@/lib/fees';
import { getPricingConfig } from '@/lib/settings';
import { createSquarePayment, refundByStoredIds, isSquareConfigured } from '@/lib/square';
import type { EscrowStatus, TitleTransferOption, PaymentMethod } from '@/lib/types';
import { ESCROW_NEXT_ACTION } from '@/lib/escrow';
import { judgeTitleTransfer } from '@/lib/title-region';
import { dispatchWebhook } from '@/lib/dealer';
import { recordDealerSaleCommission } from '@/lib/sale-commission';
import { sendPaymentConfirmedEmail, sendDealCompletedEmail, sendEmail, opsEmail, emailLayout } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { grantPersonalCoupon } from '@/lib/coupons-grant';

/** 会話からエスクロー取引を作成（買主のみ）。出品は「商談中」に更新。 */
export async function createEscrow(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/messages/${conversationId}`);

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, listings(price, status, prefecture)')
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
  // エスクロー手数料は規定の段階制。売り手・買い手の両方に同額を課す（履歴として両方を記録）。
  const cfg = await getPricingConfig();
  const fee = escrowFee(price, cfg);
  // 名義変更オプションを地域から自動判定（買主の登録地域 × 車両の所在地）。
  const { data: buyerProf } = await supabase.from('profiles').select('prefecture').eq('id', conv.buyer_id).maybeSingle();
  const judged = judgeTitleTransfer((buyerProf as { prefecture?: string | null } | null)?.prefecture, (conv as any).listings?.prefecture);
  const { data: created, error } = await supabase
    .from('escrow_transactions')
    .insert({
      listing_id: conv.listing_id,
      conversation_id: conversationId,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      amount: price,
      escrow_fee: fee,
      seller_fee: fee,
      title_option: judged.option,
      title_fee: TITLE_OPTIONS[judged.option].fee,
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

  // この段階で操作してよい役割か（UI だけでなくサーバー側でも厳格に検証）。
  // 例：title_transfer → completed（＝売主への送金確定）は買主のみ実行可。
  const callerRole: 'buyer' | 'seller' = tx.buyer_id === user.id ? 'buyer' : 'seller';
  const na = ESCROW_NEXT_ACTION[tx.status as EscrowStatus];
  if (!na || (na.by !== 'both' && na.by !== callerRole)) {
    redirect(`/escrow/${escrowId}`);
  }

  const idx = ORDER.indexOf(tx.status as EscrowStatus);
  if (idx < 0 || idx >= ORDER.length - 1) return;
  const next = ORDER[idx + 1];

  // 競合防止：現在ステータスのときだけ遷移（二重送信・同時操作対策）。
  const { error: upErr } = await supabase
    .from('escrow_transactions')
    .update({ status: next })
    .eq('id', escrowId)
    .eq('status', tx.status);
  if (upErr) redirect(`/escrow/${escrowId}`);
  if (next === 'completed') {
    await supabase.from('listings').update({ status: 'sold' }).eq('id', tx.listing_id);

    // 加盟店の自社在庫が売れた場合は成果報酬（販売手数料）を記録
    await recordDealerSaleCommission(escrowId);

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

  // エスクローでは当事者間の自己手続き（self）は不可。代行のみ許可。
  if (option === 'self') redirect(`/escrow/${escrowId}`);

  await supabase
    .from('escrow_transactions')
    .update({ title_option: option, title_fee: TITLE_OPTIONS[option].fee })
    .eq('id', escrowId)
    .eq('status', 'initiated')
    .eq('buyer_id', user.id);
  revalidatePath(`/escrow/${escrowId}`);
}

/** 追加オプション（保証・車庫証明など）を取引に保存（取引開始前・買主のみ）。
 *  金額は買主が選んだ内容。合計を options_total に保存し、支払総額へ反映する。
 *  不正値を避けるため key/label/amount をサニタイズ・上限クランプする。 */
const ALLOWED_OPTION_KEYS = new Set(['warranty', 'garage']);
export async function setEscrowOptions(
  escrowId: string,
  options: { key: string; label: string; amount: number }[],
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const clean = (Array.isArray(options) ? options : [])
    .filter((o) => o && ALLOWED_OPTION_KEYS.has(o.key))
    .map((o) => ({
      key: String(o.key).slice(0, 24),
      label: String(o.label ?? '').slice(0, 60),
      // 0〜200万円の整数にクランプ（異常値ガード）
      amount: Math.max(0, Math.min(2_000_000, Math.round(Number(o.amount) || 0))),
    }))
    .filter((o) => o.amount > 0);

  const optionsTotal = clean.reduce((s, o) => s + o.amount, 0);

  const { error } = await supabase
    .from('escrow_transactions')
    .update({ options: clean, options_total: optionsTotal })
    .eq('id', escrowId)
    .eq('status', 'initiated')
    .eq('buyer_id', user.id);
  if (error) {
    return { error: 'オプションの保存に失敗しました（設定が未完了の可能性）。運営にお問い合わせください。' };
  }
  revalidatePath(`/escrow/${escrowId}`);
  return { error: null };
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
    .select('amount, escrow_fee, title_fee, buyer_id, status, installment_count')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || tx.buyer_id !== user.id || tx.status !== 'initiated') return;

  const subtotal = tx.amount + tx.escrow_fee + tx.title_fee;
  // 2回分割払いを選択済みの場合は定額の分割手数料を維持する
  const fee = tx.installment_count === 2 ? INSTALLMENT_FEE : installmentFeeFor(method, subtotal);
  // 買い手がローンを使う場合はローン手数料を算出・記録（頭金なし＝小計を元金とみなす）。他の方法では0。
  const cfg = await getPricingConfig();
  const loan = method === 'loan' ? loanFee(subtotal, cfg) : 0;
  await supabase
    .from('escrow_transactions')
    .update({ payment_method: method, installment_fee: fee, loan_fee: loan })
    .eq('id', escrowId)
    .eq('status', 'initiated');
  revalidatePath(`/escrow/${escrowId}`);
}

/**
 * クレジットカードの分割回数を設定（買主・initiated・未入金のみ）。
 * 2回を選ぶと定額の分割手数料（INSTALLMENT_FEE）を上乗せする。
 * ※ カード決済へのサーチャージはカードブランド/Square規約で制限される場合があるため、
 *    本番で有効化する前に可否を確認すること。
 */
export async function setInstallment(escrowId: string, count: 1 | 2) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('amount, escrow_fee, title_fee, payment_method, buyer_id, status, installment_1_paid, installment_2_paid')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || tx.buyer_id !== user.id || tx.status !== 'initiated') return;
  // すでに一部でも入金済みなら回数は変更できない
  if (tx.installment_1_paid || tx.installment_2_paid) return;

  const subtotal = tx.amount + tx.escrow_fee + tx.title_fee;
  const fee = count === 2 ? INSTALLMENT_FEE : installmentFeeFor(tx.payment_method as PaymentMethod | null, subtotal);
  await supabase
    .from('escrow_transactions')
    .update({ installment_count: count, installment_fee: fee })
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

  // select('*') で取得（options_total 等の任意カラムが未追加でもクエリ全体が失敗しないように）
  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || tx.buyer_id !== user.id) return { error: '権限がありません' };
  if (tx.status !== 'initiated') return { error: 'この取引はすでに入金済みです' };
  // 購入前の重要事項同意（書面確認）が記録されているか。未同意なら決済不可。
  {
    let consented = true;
    try {
      const svcC = createServiceClient();
      const { data: c, error: ce } = await svcC
        .from('escrow_events').select('id').eq('escrow_id', escrowId).eq('type', 'buyer_consent').limit(1).maybeSingle();
      if (!ce) consented = !!c;
    } catch { /* 判定不可時は通す */ }
    if (!consented) return { error: '購入前の重要事項への同意が必要です。取引ページでご確認のうえお進みください。' };
  }
  // 2回分割払いは Square の決済ページ（リダイレクト）専用。インライン一括とは併用しない。
  if ((tx as { installment_count?: number }).installment_count === 2) {
    return { error: '2回に分けてのお支払いは「Squareの決済ページで支払う」からお手続きください。' };
  }
  const method = tx.payment_method as PaymentMethod | null;
  if (!method) return { error: '支払い方法を選択してください' };

  const optionsTotal = (tx as { options_total?: number }).options_total ?? 0;
  const subtotal = tx.amount + tx.escrow_fee + tx.title_fee + optionsTotal;
  const installment = installmentFeeFor(method, subtotal);
  // クーポン割引を課金額へ反映（カード/銀行振込とも整合させる）
  const discount = couponDiscount ?? 0;
  const total = Math.max(0, subtotal + installment - discount);

  // 高額取引はカード不可（Square の高率手数料を避け、銀行振込へ誘導）
  if (method === 'credit' && !isCardAllowed(subtotal)) {
    return { error: `${(CARD_MAX_YEN / 10000).toLocaleString()}万円を超えるお取引はカード決済をご利用いただけません。銀行振込でのお支払いをお選びください。` };
  }

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

  // 銀行振込は即時 funds_held にせず、振込申告を記録して運営の入金確認を待つ
  const isBankTransfer = method === 'cash';
  const { error } = await supabase
    .from('escrow_transactions')
    .update({
      status: isBankTransfer ? 'initiated' : 'funds_held',
      ...(isBankTransfer ? { transfer_reported_at: new Date().toISOString() } : {}),
      installment_fee: installment,
      square_payment_id: squarePaymentId,
      coupon_discount: discount,
    })
    .eq('id', escrowId)
    .eq('status', 'initiated');
  if (error) return { error: error.message };

  // 銀行振込：運営へ入金確認依頼を通知（fire-and-forget）
  if (isBankTransfer) {
    ;(async () => {
      try {
        const ops = opsEmail();
        if (!ops) return;
        const listingRes = await supabase.from('listings').select('title').eq('id', tx.listing_id).maybeSingle();
        const listingTitle = (listingRes.data as { title?: string } | null)?.title ?? '車両';
        await sendEmail({
          to: ops,
          subject: `【BUYMO】銀行振込の入金確認依頼 — ${listingTitle}`,
          html: emailLayout('銀行振込の入金確認依頼', `
            <p style="margin:8px 0;color:#475569;font-size:14px">買い手が銀行振込を申告しました。着金を確認のうえ、管理画面「取引監視」から<b>入金を確認</b>してください。</p>
            <p style="margin:8px 0;color:#475569;font-size:14px">取引ID：${escrowId}<br>金額（目安）：¥${total.toLocaleString()}</p>`),
        });
      } catch { /* 通知失敗は無視 */ }
    })().catch(() => {});
  }

  // 入金確認メール + 通知（カード/ローン等・即時 funds_held のみ。銀行振込は確認後に送る）
  if (!isBankTransfer) (async () => {
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

  // 口コミ投稿のお礼：個人宛¥5,000クーポンを発行（取引×投稿者ごとに1枚・冪等）。
  // クーポン発行や通知の失敗はレビュー投稿自体の成功を妨げない。
  let coupon: string | null = null;
  try {
    const svc = createServiceClient();
    const res = await grantPersonalCoupon(svc, 'review', [escrowId, user.id]);
    coupon = res.code;
    if (res.created && res.code) {
      await createNotification(
        user.id,
        'system',
        '🎁 口コミ投稿ありがとうございます',
        `お礼として次回のお取引で使える¥${res.value.toLocaleString()}クーポンをプレゼント！ クーポンコード：${res.code}（180日間有効・1回限り）`,
        '/dashboard',
      );
    }
  } catch {
    /* クーポン発行失敗は無視 */
  }

  revalidatePath(`/escrow/${escrowId}`);
  return { error: null, coupon };
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
    .select('status, listing_id, buyer_id, seller_id, payment_method, square_payment_id, square_payment_id_2, installment_count, installment_1_paid, installment_2_paid')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx || (tx.buyer_id !== user.id && tx.seller_id !== user.id)) redirect('/messages');
  if (tx.status !== 'initiated' && tx.status !== 'funds_held') return;

  // クレジット決済済みの場合は Square に返金リクエスト（捕捉額どおりに全額返金）
  if (tx.status === 'funds_held' && tx.payment_method === 'credit' && isSquareConfigured()) {
    // 入金済みの各回の識別子を集める（1回払い＝1本、2回払い＝入金済みの回のみ）
    const storedIds: string[] = [];
    const count = (tx.installment_count ?? 1) as number;
    if (count === 2) {
      if (tx.installment_1_paid && tx.square_payment_id) storedIds.push(tx.square_payment_id);
      if (tx.installment_2_paid && tx.square_payment_id_2) storedIds.push(tx.square_payment_id_2);
    } else if (tx.square_payment_id) {
      storedIds.push(tx.square_payment_id);
    }
    if (storedIds.length) {
      // fire-and-forget（返金失敗はログのみ・要運用対応）。キャンセル自体はブロックしない。
      refundByStoredIds({
        storedIds,
        idempotencyKeyBase: `refund-cancel-${escrowId}`,
        reason: 'エスクロー取引キャンセルによる返金',
      })
        .then((r) => { if (!r.ok) console.error(`[escrow cancel] refund failed escrow=${escrowId}: ${r.error}`); })
        .catch((e) => console.error(`[escrow cancel] refund error escrow=${escrowId}:`, e));
    }
  }

  await supabase.from('escrow_transactions').update({ status: 'cancelled' }).eq('id', escrowId);
  await supabase.from('listings').update({ status: 'active' }).eq('id', tx.listing_id);
  revalidatePath(`/escrow/${escrowId}`);
}
