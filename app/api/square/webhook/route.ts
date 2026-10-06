import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySquareWebhook } from '@/lib/square';
import { settleSquarePaymentCompleted, clearFailedSquarePayment } from '@/lib/escrow-payment';
import { createServiceClient } from '@/lib/supabase/service';

// Square Webhook の仕様:
//   Square Developer Dashboard > Webhooks > Endpoint URL に
//   https://<your-domain>/api/square/webhook を登録し、
//   以下のイベントを購読してください:
//     payment.completed  payment.failed
//     refund.completed   refund.failed
//
// SQUARE_WEBHOOK_SIGNATURE_KEY を環境変数に設定すること。

export async function POST(req: Request) {
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  // 生のボディを取得（署名検証に必要）
  const rawBody = await req.text();

  // 署名検証（キー未設定時はスキップ＝ローカル開発用）
  if (sigKey) {
    const hdrs = await headers();
    const receivedSig = hdrs.get('x-square-hmacsha256-signature') ?? '';
    const url = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/square/webhook`
      : req.url;
    const valid = await verifySquareWebhook(rawBody, receivedSig, url);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.type as string | undefined;
  const data = event.data as Record<string, unknown> | undefined;

  const supabase = createServiceClient();

  // payment.completed — 冪等に funds_held へ遷移させる
  if (eventType === 'payment.completed') {
    const payment = (data?.object as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    // 決済リンク経由では order_id が保存済みの識別子。payment.id もフォールバックで照合。
    const matchIds = [payment?.order_id as string | undefined, payment?.id as string | undefined].filter(Boolean) as string[];
    // 1回払い／2回分割払いのどちらも処理（2回払いは両回完了時のみ funds_held）
    await settleSquarePaymentCompleted(supabase, matchIds);
  }

  // payment.failed — 該当する回の識別子をクリアして buyer に再入金を促す
  if (eventType === 'payment.failed') {
    const payment = (data?.object as Record<string, unknown>)?.payment as Record<string, unknown> | undefined;
    const matchIds = [payment?.order_id as string | undefined, payment?.id as string | undefined].filter(Boolean) as string[];
    await clearFailedSquarePayment(supabase, matchIds);
  }

  // refund.completed / refund.failed — ログのみ（運用対応）
  // 必要に応じてここに通知処理（Slack webhook, メール等）を追加してください

  return NextResponse.json({ received: true });
}
