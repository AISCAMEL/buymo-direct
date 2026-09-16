import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaymentLink, isSquareConfigured } from '@/lib/square';

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

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('id, amount, escrow_fee, title_fee, installment_fee, buyer_id, status, listing_id')
    .eq('id', escrow_id)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }
  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (tx.status !== 'initiated') {
    return NextResponse.json({ error: 'この取引はすでに入金済みです' }, { status: 400 });
  }

  const total = tx.amount + tx.escrow_fee + tx.title_fee + (tx.installment_fee ?? 0);

  let url: string;
  let paymentId: string;

  if (!isSquareConfigured()) {
    // Square 未設定時はモック URL（開発・サンドボックス用）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    url = `${siteUrl}/escrow/${escrow_id}?demo=payment`;
    paymentId = `demo-${Date.now()}`;
  } else {
    const { data: listing } = await supabase
      .from('listings')
      .select('title')
      .eq('id', tx.listing_id)
      .maybeSingle();

    const listingTitle = (listing as { title?: string } | null)?.title ?? '車両代金';
    const description = `BUYMO ダイレクト - ${listingTitle}`;

    try {
      const result = await createPaymentLink(total, escrow_id, description);
      url = result.url;
      paymentId = result.paymentId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '決済リンクの生成に失敗しました';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // 生成した payment link ID をエスクローレコードに保存
  await supabase
    .from('escrow_transactions')
    .update({ square_payment_id: paymentId })
    .eq('id', escrow_id);

  return NextResponse.json({ url });
}
