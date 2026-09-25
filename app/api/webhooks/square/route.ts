import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySquareWebhook } from '@/lib/square';
import { createServiceClient } from '@/lib/supabase/service';

// Square Developer Dashboard > Webhooks > Endpoint URL に
// https://<your-domain>/api/webhooks/square を登録し、
// 以下のイベントを購読してください:
//   payment.completed  payment.failed
//
// SQUARE_WEBHOOK_SIGNATURE_KEY を環境変数に設定すること。

export async function POST(req: Request) {
  // 生のボディを取得（署名検証に必要）
  const rawBody = await req.text();

  const hdrs = await headers();
  const receivedSig = hdrs.get('x-square-hmacsha256-signature') ?? '';
  const url = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/square`
    : req.url;

  // 署名検証（SQUARE_WEBHOOK_SIGNATURE_KEY 未設定時はスキップ）
  const valid = await verifySquareWebhook(rawBody, receivedSig, url);
  if (!valid) {
    console.error('[Square webhook] Invalid HMAC signature — ignoring event');
    // Square には常に 200 を返す
    return NextResponse.json({ received: true });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  const eventType = event.type as string | undefined;
  const data = event.data as Record<string, unknown> | undefined;

  const supabase = createServiceClient();

  // payment.completed — 冪等に funds_held へ遷移させる
  if (eventType === 'payment.completed') {
    const payment = (data?.object as Record<string, unknown>)?.payment as
      | Record<string, unknown>
      | undefined;
    // 決済リンク経由では order_id が保存済みの識別子。念のため payment.id もフォールバックで照合。
    const orderId = payment?.order_id as string | undefined;
    const squarePaymentId = payment?.id as string | undefined;
    const matchIds = [orderId, squarePaymentId].filter(Boolean) as string[];

    if (matchIds.length) {
      const { data: updated } = await supabase
        .from('escrow_transactions')
        .update({ status: 'funds_held' })
        .in('square_payment_id', matchIds)
        .eq('status', 'initiated') // 冪等：既に funds_held なら更新なし
        .select('id')
        .maybeSingle();

      if (updated) {
        revalidatePath(`/escrow/${(updated as { id: string }).id}`);
      }
    }
  }

  // payment.failed — ログのみ
  if (eventType === 'payment.failed') {
    const payment = (data?.object as Record<string, unknown>)?.payment as
      | Record<string, unknown>
      | undefined;
    const squarePaymentId = payment?.id as string | undefined;
    console.log(`[Square webhook] payment.failed: paymentId=${squarePaymentId ?? 'unknown'}`);
  }

  // Square には常に 200 を返す
  return NextResponse.json({ received: true });
}
