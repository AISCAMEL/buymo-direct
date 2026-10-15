// SMS送信（Twilio REST API）。SDK 依存なし。
// 環境変数:
//   TWILIO_ACCOUNT_SID … Twilio のアカウントSID
//   TWILIO_AUTH_TOKEN  … Twilio の認証トークン
//   TWILIO_FROM        … 送信元番号（E.164 例: +815012345678 / または Messaging Service SID: MGxxxx）
// いずれか未設定なら送信スキップ（＝デモ動作：OTPを画面に表示）。

export function isSmsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  );
}

/** 国内番号（0始まり）を E.164（+81…）へ正規化。既に + 始まりならそのまま。 */
export function toE164Jp(phone: string): string {
  const p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+81' + p.slice(1);
  return p;
}

/** SMS送信（ベストエフォート）。未設定・失敗時も例外を投げない。 */
export async function sendSms(
  to: string,
  body: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isSmsConfigured()) return { ok: false, skipped: true };
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!;
  const e164 = toE164Jp(to);

  const form = new URLSearchParams();
  form.set('To', e164);
  // Messaging Service SID（MG…）なら MessagingServiceSid、それ以外は From
  if (from.startsWith('MG')) form.set('MessagingServiceSid', from);
  else form.set('From', from);
  form.set('Body', body);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'sms failed' };
  }
}
