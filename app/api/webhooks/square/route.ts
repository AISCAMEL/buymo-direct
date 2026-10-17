import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySquareWebhook } from '@/lib/square';
import { settleSquarePaymentCompleted, clearFailedSquarePayment } from '@/lib/escrow-payment';
import { createServiceClient } from '@/lib/supabase/service';

// Square 決済の唯一の Webhook エンドポイント。
// Square Developer Dashboard > Webhooks > Endpoint URL に
//   https://<your-domain>/api/webhooks/square
// を登録し、以下のイベントを購読してください:
//   payment.completed  payment.failed  refund.created  refund.updated
//
// SQUARE_WEBHOOK_SIGNATURE_KEY を環境変数に設定すること（本番では必須・未設定時は拒否）。

export async function POST(req: Request) {
  // 生のボディを取得（署名検証に必要）
  const rawBody = await req.text();

  const hdrs = await headers();
  const receivedSig = hdrs.get('x-square-hmacsha256-signature') ?? '';
  const url = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/square`
    : req.url;

  // 署名検証（本番で SQUARE_WEBHOOK_SIGNATURE_KEY 未設定なら fail-closed で拒否）
  const valid = await verifySquareWebhook(rawBody, receivedSig, url);
  if (!valid) {
    console.error('[Square webhook] Invalid HMAC signature — ignoring event');
    // Square へは常に 200 を返す（再送ループを避ける）
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

  const paymentIds = (): string[] => {
    const payment = (data?.object as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    // 決済リンク経由では order_id が保存済みの識別子。payment.id もフォールバックで照合。
    return [payment?.order_id as string | undefined, payment?.id as string | undefined].filter(Boolean) as string[];
  };

  switch (eventType) {
    case 'payment.completed': {
      // 冪等に funds_held へ遷移（1回払い／2回分割払いの両対応）
      const affectedId = await settleSquarePaymentCompleted(supabase, paymentIds());
      if (affectedId) revalidatePath(`/escrow/${affectedId}`);
      break;
    }
    case 'payment.failed': {
      // 該当する回の識別子をクリアし、buyer に再入金を促す
      const affectedId = await clearFailedSquarePayment(supabase, paymentIds());
      if (affectedId) revalidatePath(`/escrow/${affectedId}`);
      break;
    }
    case 'refund.created':
    case 'refund.updated': {
      // 返金イベント：運用ログのみ（必要に応じて通知処理を追加）
      const refund = (data?.object as Record<string, unknown>)?.refund as Record<string, unknown> | undefined;
      console.log(`[Square webhook] ${eventType}: refundId=${(refund?.id as string) ?? 'unknown'} status=${(refund?.status as string) ?? 'unknown'}`);
      break;
    }
    default:
      // 未購読イベントは無視
      break;
  }

  // Square へは常に 200 を返す
  return NextResponse.json({ received: true });
}
