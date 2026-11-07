// Twilio 連携ユーティリティ（AI電話）。
// 環境変数（すべて「後ほど」設定）:
//   TWILIO_ACCOUNT_SID   … アカウントSID（発信に必要）
//   TWILIO_AUTH_TOKEN    … 認証トークン（署名検証・発信に必要）
//   TWILIO_PHONE_NUMBER  … 発信元の電話番号（E.164 例:+81xxxxxxxxxx）
//   TWILIO_TTS_VOICE     … 読み上げ音声（既定: Polly.Mizuki＝日本語女性）
import crypto from 'crypto';

/** 着信AIを有効化できるか（署名検証に AUTH_TOKEN が必要）。 */
export function isTwilioConfigured(): boolean {
  return !!process.env.TWILIO_AUTH_TOKEN;
}

/** 発信（REST API）が使えるか。 */
export function isTwilioRestConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

/** 設定状況（値は返さず有無のみ）。管理画面表示用。 */
export function twilioConfigStatus() {
  return {
    accountSid: !!process.env.TWILIO_ACCOUNT_SID,
    authToken: !!process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
    ttsVoice: process.env.TWILIO_TTS_VOICE || 'Polly.Mizuki',
  };
}

/**
 * Twilio の署名（X-Twilio-Signature）を検証する。
 * 署名対象 = フルURL + パラメータをキー昇順で連結した文字列。
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expected = crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Twilio REST API で発信する。body は Url か Twiml のどちらかを含む。 */
async function createCall(to: string, extra: Record<string, string>): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: 'Twilioが未設定です（TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER）' };
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      },
      body: new URLSearchParams({ To: to, From: from, ...extra }),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
    return { ok: true, sid: data?.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '発信に失敗しました' };
  }
}

/** TwiML を取得するURLを指定して発信する。 */
export function placeOutboundCall(to: string, twimlUrl: string) {
  return createCall(to, { Url: twimlUrl });
}

/** インラインTwiML（XML文字列）を指定して発信する。 */
export function placeOutboundCallTwiml(to: string, twiml: string) {
  return createCall(to, { Twiml: twiml });
}
