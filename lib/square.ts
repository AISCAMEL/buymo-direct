// Square Payments API（REST）ラッパー。SDK 依存なしで fetch 実行。
// 必要な環境変数:
//   SQUARE_ACCESS_TOKEN              … サーバ用アクセストークン（秘匿）
//   SQUARE_ENVIRONMENT               … 'sandbox'（既定）| 'production'
//   SQUARE_LOCATION_ID               … ロケーションID
//   SQUARE_WEBHOOK_SIGNATURE_KEY     … Webhook 署名検証キー
//   NEXT_PUBLIC_SQUARE_APPLICATION_ID … Web Payments SDK 用（クライアント）
//   NEXT_PUBLIC_SQUARE_LOCATION_ID    … 同上
//
// 未設定時は isSquareConfigured()=false を返し、呼び出し側はデモ（無課金）動作に
// フォールバックする。

const SQUARE_VERSION = '2024-10-17';

export function isSquareConfigured(): boolean {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function apiBase(): string {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export interface SquarePaymentResult {
  ok: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Webhook 署名を検証する。
 * Square は HMAC-SHA256(key, url + body) を Base64 エンコードして送信する。
 * SQUARE_WEBHOOK_SIGNATURE_KEY が未設定の場合は検証をスキップ（開発用）。
 */
export async function verifySquareWebhook(
  body: string,
  signature: string,
  url: string
): Promise<boolean> {
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!sigKey) return true; // キー未設定はローカル開発用にスキップ

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sigKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = encoder.encode(url + body);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

/**
 * Square Online Checkout で決済リンクを生成する。
 * 購入者は Square ホスト型ページにリダイレクトしてカード情報を入力する。
 * 未設定時はモック URL を返す。
 */
export async function createPaymentLink(
  amount: number,
  orderId: string,
  description: string
): Promise<{ url: string; paymentId: string }> {
  if (!isSquareConfigured()) {
    return {
      url: `/escrow/${orderId}?demo=payment`,
      paymentId: `demo-${Date.now()}`,
    };
  }

  const res = await fetch(`${apiBase()}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotency_key: `paylink-${orderId}`,
      order: {
        location_id: process.env.SQUARE_LOCATION_ID,
        line_items: [
          {
            name: description.slice(0, 500),
            quantity: '1',
            base_price_money: {
              amount,
              currency: 'JPY',
            },
          },
        ],
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.errors?.[0]?.detail ?? `Square error (${res.status})`;
    throw new Error(msg);
  }

  return {
    url: json.payment_link.url as string,
    paymentId: json.payment_link.id as string,
  };
}

/**
 * カードトークン（Web Payments SDK の sourceId）で支払いを作成。
 * JPY は最小単位＝1円なので amountYen をそのまま渡す。
 */
export async function createSquarePayment(params: {
  sourceId: string;
  amountYen: number;
  idempotencyKey: string;
  note?: string;
}): Promise<SquarePaymentResult> {
  if (!isSquareConfigured()) {
    return { ok: false, error: 'Square is not configured' };
  }

  try {
    const res = await fetch(`${apiBase()}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: params.sourceId,
        idempotency_key: params.idempotencyKey,
        amount_money: { amount: params.amountYen, currency: 'JPY' },
        location_id: process.env.SQUARE_LOCATION_ID,
        note: params.note?.slice(0, 500),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.errors?.[0]?.detail ?? `Square error (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, paymentId: json?.payment?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Square request failed' };
  }
}

/**
 * Square 決済を返金する。キャンセル時に呼び出す。
 * amountYen を省略すると全額返金。
 */
export async function refundSquarePayment(params: {
  paymentId: string;
  amountYen: number;
  idempotencyKey: string;
  reason?: string;
}): Promise<SquarePaymentResult> {
  if (!isSquareConfigured()) {
    return { ok: false, error: 'Square is not configured' };
  }

  try {
    const res = await fetch(`${apiBase()}/v2/refunds`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: params.idempotencyKey,
        payment_id: params.paymentId,
        amount_money: { amount: params.amountYen, currency: 'JPY' },
        reason: params.reason?.slice(0, 192),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.errors?.[0]?.detail ?? `Square refund error (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, paymentId: json?.refund?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Square refund failed' };
  }
}
