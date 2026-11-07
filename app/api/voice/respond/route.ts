/**
 * POST /api/voice/respond — 発話（音声認識結果）を受けてAIが応答し、会話を続ける。
 * /api/voice/incoming の <Gather action> から呼ばれる。
 */
import type { NextRequest } from 'next/server';
import { isTwilioConfigured, validateTwilioSignature } from '@/lib/twilio';
import { twimlResponse, say, gatherSpeech, hangup, pause } from '@/lib/twiml';
import { voiceReply, voiceReprompt, isGoodbye } from '@/lib/voice-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

function formToObj(form: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') o[k] = v;
  return o;
}

export async function POST(req: NextRequest) {
  if (!isTwilioConfigured()) {
    return twimlResponse(say('ただいま準備中です。失礼いたします。') + hangup());
  }

  const form = await req.formData();
  const params = formToObj(form);
  if (!validateTwilioSignature(`${SITE}/api/voice/respond`, params, req.headers.get('x-twilio-signature'))) {
    return new Response('Forbidden', { status: 403 });
  }

  const callSid = params.CallSid ?? '';
  const speech = (params.SpeechResult ?? '').trim();

  // 聞き取れなかった → 再度うかがう
  if (!speech) {
    return twimlResponse(gatherSpeech('/api/voice/respond', voiceReprompt()));
  }

  // 終了の合図 → お礼を言って切る
  if (isGoodbye(speech)) {
    return twimlResponse(say('お電話ありがとうございました。バイモ ダイレクトをどうぞよろしくお願いいたします。失礼いたします。') + hangup());
  }

  // AI応答 → 読み上げて、続けて次の発話をうかがう
  const reply = await voiceReply(callSid, speech);
  return twimlResponse(say(reply) + pause(1) + gatherSpeech('/api/voice/respond', '他にご質問はありますか？'));
}
