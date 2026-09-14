const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return realistic mock Japanese text when no API key is set
    return 'こちらの車両は状態が良く、定期メンテナンスも施されております。ワンオーナー車で、内外装ともに綺麗な状態を保っております。走行距離も少なく、まだまだ長くお乗りいただけます。お気軽にお問い合わせください。';
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };

  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('No text in Claude response');
  return text;
}
