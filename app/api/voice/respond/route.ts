/**
 * POST /api/voice/respond — 発話（音声認識結果）を受けて会話を進める。
 * 高機能オペレーター：1ターン＝AI1回で「話す言葉」と「予約状態」を同時に得る（高速＝切断されにくい）。
 * 用件・お名前・希望時間が揃い同意が取れたら折り返し予約を確定・保存して終話。
 * 無言が続いても行き止まりにせず聞き直し、一定回数で丁寧に終話する。
 */
import type { NextRequest } from 'next/server';
import { isTwilioConfigured, validateTwilioRequest } from '@/lib/twilio';
import { twimlResponse, say, gatherSpeech, hangup } from '@/lib/twiml';
import { voiceReprompt } from '@/lib/voice-ai';
import { operatorTurn } from '@/lib/voice-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

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
  if (!validateTwilioRequest(req, '/api/voice/respond', params, `${SITE}/api/voice/respond`)) {
    return new Response('Forbidden', { status: 403 });
  }

  const callSid = params.CallSid ?? '';
  const from = params.From;
  const speech = (params.SpeechResult ?? '').trim();

  // 無言：2回までは聞き直し、それ以上は丁寧に終話（無限ループ・無駄な課金を防止）
  if (!speech) {
    const tries = Number(req.nextUrl.searchParams.get('e') ?? '0') || 0;
    if (tries >= 2) {
      return twimlResponse(
        say('お声が届かないようです。恐れ入りますが、改めてお電話いただくか、ウェブのお問い合わせをご利用ください。失礼いたします。') + hangup(),
      );
    }
    return twimlResponse(gatherSpeech(`/api/voice/respond?e=${tries + 1}`, voiceReprompt()));
  }

  // AI 1回で応答文＋予約判定
  const { say: line, finished } = await operatorTurn(callSid, speech, from);
  if (finished) {
    return twimlResponse(say(line) + hangup());
  }
  return twimlResponse(gatherSpeech('/api/voice/respond', line));
}
