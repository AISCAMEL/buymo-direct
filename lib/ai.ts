// AI 生成の共通ラッパー。
// プロバイダは OpenRouter（OpenAI互換）を優先し、無ければ Anthropic ネイティブ、
// どちらも無ければモック/例外（デモ動作）にフォールバックする。
//
// 環境変数:
//   OPENROUTER_API_KEY … OpenRouter の API キー（推奨）
//   OPENROUTER_MODEL   … 使用モデルslug（例: anthropic/claude-3.5-haiku）未設定なら既定値
//   ANTHROPIC_API_KEY  … Anthropic を直接使う場合のキー（任意）

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'; // Anthropic ネイティブ時の既定
const OPENROUTER_DEFAULT_MODEL = 'anthropic/claude-3.5-haiku'; // OpenRouter 時の既定

export type AiProvider = 'openrouter' | 'anthropic' | null;

/** 利用可能な AI プロバイダ（OpenRouter 優先）。未設定なら null。 */
export function aiProvider(): AiProvider {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

/** AI が有効か（いずれかのキーが設定済みか）。 */
export function isAiEnabled(): boolean {
  return aiProvider() !== null;
}

function openRouterHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'X-Title': 'BUYMO Direct',
  };
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) h['HTTP-Referer'] = site;
  return h;
}

/** OpenRouter 用のモデルslug を決定（引数がslug形なら尊重）。 */
function openRouterModel(model: string): string {
  if (model && model.includes('/')) return model;
  return process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL;
}

export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024,
): Promise<string> {
  const provider = aiProvider();

  if (!provider) {
    // キー未設定時は現実的なモック日本語（デモ動作）
    return 'こちらの車両は状態が良く、定期メンテナンスも施されております。ワンオーナー車で、内外装ともに綺麗な状態を保っております。走行距離も少なく、まだまだ長くお乗りいただけます。お気軽にお問い合わせください。';
  }

  if (provider === 'openrouter') {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: openRouterHeaders(process.env.OPENROUTER_API_KEY!),
      body: JSON.stringify({ model: openRouterModel(model), max_tokens: maxTokens, messages }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No text in OpenRouter response');
    return text;
  }

  // Anthropic ネイティブ
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as { content: { type: string; text: string }[] };
  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('No text in Claude response');
  return text;
}

export type VisionImage = { mediaType: string; dataBase64: string };

/** 画像つきで問い合わせる（車両状態のAI診断など）。AIキー必須。 */
export async function generateWithClaudeVision(
  prompt: string,
  images: VisionImage[],
  model: string = DEFAULT_MODEL,
  maxTokens: number = 700,
): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new Error('AI キー（OPENROUTER_API_KEY / ANTHROPIC_API_KEY）が未設定です');

  if (provider === 'openrouter') {
    const content: unknown[] = images.slice(0, 4).map((img) => ({
      type: 'image_url',
      image_url: { url: `data:${img.mediaType};base64,${img.dataBase64}` },
    }));
    content.push({ type: 'text', text: prompt });

    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: openRouterHeaders(process.env.OPENROUTER_API_KEY!),
      body: JSON.stringify({
        model: openRouterModel(model),
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter vision API error ${res.status}: ${errText}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No text in OpenRouter vision response');
    return text;
  }

  // Anthropic ネイティブ
  const content: unknown[] = images.slice(0, 4).map((img) => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mediaType, data: img.dataBase64 },
  }));
  content.push({ type: 'text', text: prompt });

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude vision API error ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as { content: { type: string; text: string }[] };
  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('No text in Claude vision response');
  return text;
}
