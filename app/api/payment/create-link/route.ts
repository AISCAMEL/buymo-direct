import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaymentLink, isSquareConfigured } from '@/lib/square';
import { isCardAllowed, CARD_MAX_YEN } from '@/lib/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { escrow_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { escrow_id } = body;
  if (!escrow_id) {
    return NextResponse.json({ error: 'escrow_id is required' }, { status: 400 });
  }

  // select('*') で取得（一部の任意カラムが未定義でもクエリ全体が失敗しないように）。
  const { data: txRow, error: txErr } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('id', escrow_id)
    .maybeSingle();

  if (txErr) {
    return NextResponse.json({ error: '取引情報の取得に失敗しました' }, { status: 500 });
  }
  if (!txRow) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }
  const tx = txRow as {
    amount: number; escrow_fee: number; title_fee: number; options_total?: number; installment_fee?: number;
    installment_count?: number; installment_1_paid?: boolean; installment_2_paid?: boolean;
    coupon_discount?: number; buyer_id: string; status: string; listing_id: string;
  };
  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (tx.status !== 'initiated') {
    return NextResponse.json({ error: 'この取引はすでに入金済みです' }, { status: 400 });
  }

  // 購入前の重要事項同意（書面確認）が記録されているか。未同意なら決済不可。
  {
    let consented = true;
    try {
      const { data: c, error: ce } = await supabase
        .from('escrow_events').select('id').eq('escrow_id', escrow_id).eq('type', 'buyer_consent').limit(1).maybeSingle();
      if (!ce) consented = !!c;
    } catch { /* 判定不可時は通す */ }
    if (!consented) {
      return NextResponse.json({ error: '購入前の重要事項への同意が必要です。取引ページでご確認ください。' }, { status: 400 });
    }
  }

  // 高額取引はカード不可（Square の高率手数料を避け、銀行振込へ誘導）
  const cardBasis = tx.amount + tx.escrow_fee + tx.title_fee + (tx.options_total ?? 0);
  if (!isCardAllowed(cardBasis)) {
    return NextResponse.json(
      { error: `${(CARD_MAX_YEN / 10000).toLocaleString()}万円を超えるお取引はカード決済をご利用いただけません。銀行振込でのお支払いをお選びください。` },
      { status: 400 }
    );
  }

  // クーポン割引・分割手数料を反映した実請求額（画面表示と一致させる）
  const total = Math.max(
    0,
    tx.amount + tx.escrow_fee + tx.title_fee + (tx.options_total ?? 0) + (tx.installment_fee ?? 0) - (tx.coupon_discount ?? 0)
  );

  // 2回分割払い：未払いの回の金額と、保存先の識別子カラムを決定する
  const isInstallment = (tx.installment_count ?? 1) === 2;
  const half1 = Math.ceil(total / 2);
  const half2 = total - half1;
  let chargeAmount = total;
  let storeColumn: 'square_payment_id' | 'square_payment_id_2' = 'square_payment_id';
  let installmentNote = '';
  if (isInstallment) {
    if (!tx.installment_1_paid) {
      chargeAmount = half1;
      storeColumn = 'square_payment_id';
      installmentNote = '（2回払い 1/2）';
    } else if (!tx.installment_2_paid) {
      chargeAmount = half2;
      storeColumn = 'square_payment_id_2';
      installmentNote = '（2回払い 2/2）';
    } else {
      return NextResponse.json({ error: 'すでに全額入金済みです' }, { status: 400 });
    }
  }

  let url: string;
  // 決済完了 Webhook と突き合わせる識別子（Square の order_id、デモ時はダミーID）
  let matchId: string;

  if (!isSquareConfigured()) {
    // 本番で決済未設定ならデモURLを返さず拒否（デモ合格の無効化）
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: '決済サービスが未設定です。運営までお問い合わせください。' }, { status: 503 });
    }
    // 開発時のみモック URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    url = `${siteUrl}/escrow/${escrow_id}?demo=payment`;
    matchId = `demo-${Date.now()}`;
  } else {
    const { data: listing } = await supabase
      .from('listings')
      .select('title')
      .eq('id', tx.listing_id)
      .maybeSingle();

    const listingTitle = (listing as { title?: string } | null)?.title ?? '車両代金';
    const description = `BUYMO ダイレクト - ${listingTitle}${installmentNote}`;

    try {
      const result = await createPaymentLink(chargeAmount, escrow_id, description);
      url = result.url;
      // Webhook では payment.order_id と突き合わせるため Order ID を保存する
      matchId = result.squareOrderId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '決済リンクの生成に失敗しました';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // 決済完了 Webhook で突き合わせる識別子（Square Order ID）を保存
  // 2回払いは未払いの回に対応するカラムへ保存する
  await supabase
    .from('escrow_transactions')
    .update({ [storeColumn]: matchId })
    .eq('id', escrow_id);

  return NextResponse.json({ url });
}
