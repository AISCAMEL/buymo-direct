/**
 * POST /api/voice/outbound — AIが お客様へ発信する（架電）。
 * 管理者ログイン、または Cron秘密鍵で実行可能。body: { to: "+81...", message?: string }
 * Twilio（SID/TOKEN/PHONE_NUMBER）設定後に有効。
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { isTwilioRestConfigured, placeOutboundCallTwiml } from '@/lib/twilio';
import { say, gatherSpeech } from '@/lib/twiml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const alertSecret = process.env.ALERT_CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const provided = req.headers.get('x-alert-secret') ?? req.nextUrl.searchParams.get('secret');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (alertSecret && provided === alertSecret) return true;
  return await isAdminUser();
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }
  if (!isTwilioRestConfigured()) {
    return NextResponse.json({ error: 'Twilioが未設定です（SID / AUTH_TOKEN / PHONE_NUMBER を設定してください）' }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string; message?: string };
  const to = (body.to ?? '').trim();
  if (!/^\+?[0-9]{10,15}$/.test(to.replace(/[-\s]/g, ''))) {
    return NextResponse.json({ error: '発信先の電話番号が不正です（例: +8190xxxxxxxx）' }, { status: 400 });
  }

  const opening =
    (body.message && body.message.trim()) ||
    'こちらは中古車のバイモ ダイレクトです。お車の件でお電話いたしました。';

  // 最初の挨拶 → 音声認識で会話開始（以降は /api/voice/respond が対応）
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    say(opening) +
    gatherSpeech('/api/voice/respond', '本日はどのようなご用件でしょうか。ご質問をどうぞ。') +
    `</Response>`;

  const result = await placeOutboundCallTwiml(to.replace(/[-\s]/g, ''), twiml);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, sid: result.sid });
}
