// TwiML（Twilioの音声応答XML）を組み立てるヘルパー。日本語読み上げ・音声入力に対応。

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function voice(): string {
  return process.env.TWILIO_TTS_VOICE || 'Polly.Mizuki';
}

/** <Say>：日本語で読み上げる。 */
export function say(text: string): string {
  return `<Say voice="${esc(voice())}" language="ja-JP">${esc(text)}</Say>`;
}

/** <Gather input="speech">：発話を音声認識して action へPOST。中に読み上げプロンプトを含む。 */
export function gatherSpeech(actionPath: string, prompt: string): string {
  return `<Gather input="speech" language="ja-JP" speechTimeout="auto" action="${esc(actionPath)}" method="POST">${say(prompt)}</Gather>`;
}

export function hangup(): string {
  return '<Hangup/>';
}

export function pause(seconds = 1): string {
  return `<Pause length="${Math.max(1, Math.round(seconds))}"/>`;
}

/** TwiML レスポンス（Content-Type: text/xml）。 */
export function twimlResponse(inner: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
}
