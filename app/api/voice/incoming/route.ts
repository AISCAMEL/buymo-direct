/**
 * POST /api/voice/incoming  — Twilio Voice の着信Webhook。
 * Twilioの電話番号の「A CALL COMES IN」にこのURLを設定する。
 * Twilio未設定（AUTH_TOKEN無し）の間は「準備中」案内で安全に無効化。
 */
import type { NextRequest } from 'next/server';
import { isTwilioConfigured, validateTwilioRequest } from '@/lib/twilio';
import { twimlResponse, say, gatherSpeech, hangup } from '@/lib/twiml';
import { getVoiceSettings } from '@/lib/voice-settings';
import { recordVoiceCall } from '@/lib/voice-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

function formToObj(form: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') o[k] = v;
  return o;
}

export async function POST(req: NextRequest) {
  // 未設定時は準備中案内（AIを呼ばず課金なし）
  if (!isTwilioConfigured()) {
    return twimlResponse(
      say('お電話ありがとうございます。ただいま電話受付の準備中です。恐れ入りますが、ウェブサイトのお問い合わせをご利用ください。') + hangup(),
    );
  }

  const form = await req.formData();
  const params = formToObj(form);
  if (!validateTwilioRequest(req, '/api/voice/incoming', params, `${SITE}/api/voice/incoming`)) {
    console.error('[voice/incoming] 署名検証に失敗（URL不一致/不正アクセスの可能性）');
    return new Response('Forbidden', { status: 403 });
  }

  // 管理画面の設定（受付ON/OFF・挨拶文）を反映
  const settings = await getVoiceSettings();
  if (!settings.enabled) {
    return twimlResponse(
      say('お電話ありがとうございます。ただいまAIの電話受付を一時停止しております。恐れ入りますが、ウェブサイトのお問い合わせをご利用ください。') + hangup(),
    );
  }

  const callSid = params.CallSid ?? '';
  void recordVoiceCall(callSid, { direction: 'inbound', from: params.From, to: params.To });

  // 第一声（管理画面で編集可能）→ 発話を音声認識して /api/voice/respond へ
  return twimlResponse(gatherSpeech('/api/voice/respond', settings.greeting));
}
