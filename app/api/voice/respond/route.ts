/**
 * POST /api/voice/respond — 発話（音声認識結果）を受けて会話を進める。
 * 予約フロー優先：用件・お名前・希望時間をうかがい、同意が取れたら折り返し予約を確定・保存。
 * 予約以外（一般質問）は従来どおりAIが短く応答して会話を続ける。
 * /api/voice/incoming の <Gather action> から呼ばれる。
 */
import type { NextRequest } from 'next/server';
import { isTwilioConfigured, validateTwilioSignature } from '@/lib/twilio';
import { twimlResponse, say, gatherSpeech, hangup, pause } from '@/lib/twiml';
import { voiceReply, voiceReprompt, isGoodbye } from '@/lib/voice-ai';
import { saveVoiceTurn } from '@/lib/voice-data';
import {
  extractBooking,
  nextBookingPrompt,
  bookingComplete,
  bookingConfirmation,
  saveVoiceBooking,
} from '@/lib/voice-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
const GOODBYE = 'お電話ありがとうございました。バイモ ダイレクトをどうぞよろしくお願いいたします。失礼いたします。';

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
  const from = params.From;
  const speech = (params.SpeechResult ?? '').trim();

  // 聞き取れなかった → 再度うかがう
  if (!speech) {
    return twimlResponse(gatherSpeech('/api/voice/respond', voiceReprompt()));
  }

  // ── 予約フロー（最優先）──
  const state = await extractBooking(callSid, speech);

  if (state && state.intent === 'end') {
    return twimlResponse(say(GOODBYE) + hangup());
  }

  if (state && state.intent === 'booking') {
    // 同意が取れて必要情報が揃った → 予約を確定・保存して締める
    if (state.confirmed && bookingComplete(state)) {
      await saveVoiceBooking(callSid, from, state);
      await saveVoiceTurn(callSid, 'user', speech);
      await saveVoiceTurn(callSid, 'assistant', '（折り返し予約を確定）');
      return twimlResponse(say(bookingConfirmation(state)) + hangup());
    }
    // 不足を聞く／揃っていれば復唱して確認
    const prompt = nextBookingPrompt(state);
    // 次ターンの「同意」判定のため、発話と案内を会話メモリへ保存
    await saveVoiceTurn(callSid, 'user', speech);
    await saveVoiceTurn(callSid, 'assistant', prompt);
    return twimlResponse(gatherSpeech('/api/voice/respond', prompt));
  }

  // ── 予約以外（一般質問）→ 従来のAI応答ループ ──
  if (isGoodbye(speech)) {
    return twimlResponse(say(GOODBYE) + hangup());
  }
  const reply = await voiceReply(callSid, speech);
  return twimlResponse(
    say(reply) + pause(1) + gatherSpeech('/api/voice/respond', '他にご質問や、折り返しのご予約などございますか？'),
  );
}
