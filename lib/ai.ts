// AI 生成の共通ラッパー。
// プロバイダは Anthropic（Claude API・公式SDK）を優先し、無ければ OpenRouter（OpenAI互換）、
// どちらも無ければモック/例外（デモ動作）にフォールバックする。
//
// 環境変数:
//   ANTHROPIC_API_KEY  … Claude API キー（推奨・優先）
//   AI_CHAT_MODEL      … 対話用モデル（既定: claude-sonnet-5-5）
//   AI_UTILITY_MODEL   … 単発生成用モデル（既定: claude-haiku-5-5）
//   OPENROUTER_API_KEY … OpenRouter の API キー（任意・フォールバック）
//   OPENROUTER_MODEL   … OpenRouter 使用モデルslug（任意）

import Anthropic from '@anthropic-ai/sdk';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';

/** 対話（チャット・運用アシスタント）用モデル。 */
export function aiChatModel(): string {
  return process.env.AI_CHAT_MODEL || 'claude-sonnet-5-5';
}
/** 単発生成（説明文・車名抽出など）用モデル。コスト重視で軽量モデル。 */
export function aiUtilityModel(): string {
  return process.env.AI_UTILITY_MODEL || 'claude-haiku-5-5';
}

export type AiProvider = 'anthropic' | 'openrouter' | null;

/** 利用可能な AI プロバイダ（Anthropic 優先）。未設定なら null。 */
export function aiProvider(): AiProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}

/** AI が有効か（いずれかのキーが設定済みか）。 */
export function isAiEnabled(): boolean {
  return aiProvider() !== null;
}

// Anthropic 公式SDK クライアント（キーがある時だけ生成・キャッシュ）
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

/** Anthropic クライアント（キーがあれば）。web_search 等の高度な呼び出し用。無ければ null。 */
export function anthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return getAnthropic();
}

/** Markdown の装飾記号を除き、チャット吹き出し向けのプレーンテキストにする。
 *  （チャットUIはプレーン表示のため ** や - がそのまま見えてしまうのを防ぐ） */
export function toPlainText(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[a-zA-Z]*/g, '').replace(/```/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')              // インラインコード
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold**
    .replace(/__([^_]+)__/g, '$1')            // __bold__
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2') // *italic*
    .replace(/^#{1,6}\s+/gm, '')              // 見出し #
    .replace(/^\s{0,3}[-*+]\s+/gm, '・')       // 箇条書き → ・
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
    .replace(/\n{3,}/g, '\n\n')               // 余分な空行を圧縮
    .trim();
}

/** Claude のレスポンスから最初のテキストブロックを取り出す。 */
function textFromMessage(msg: Anthropic.Message): string {
  for (const block of msg.content) {
    if (block.type === 'text') return block.text;
  }
  return '';
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
function openRouterModel(model: string): string {
  if (model && model.includes('/')) return model;
  return process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * 多ターン対話（会話履歴つき）。チャットボット・運用アシスタント用。
 * Anthropic があれば Claude API（会話は messages 配列で正しく渡す）。
 * 無ければ OpenRouter。どちらも無ければ例外（呼び出し側が FAQ 等へフォールバック）。
 */
export async function chatWithClaude(
  turns: ChatTurn[],
  systemPrompt: string,
  opts?: { model?: string; maxTokens?: number },
): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new Error('AI キーが未設定です');

  const model = opts?.model ?? aiChatModel();
  const maxTokens = opts?.maxTokens ?? 1024;

  // 先頭は必ず user。空ターンは除外。
  const clean = turns.filter((t) => t.content && t.content.trim());
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length) throw new Error('メッセージがありません');

  if (provider === 'anthropic') {
    const msg = await getAnthropic().messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      // 対話はコスト・レイテンシ重視で低エフォート
      output_config: { effort: 'low' },
      messages: clean.map((t) => ({ role: t.role, content: t.content })),
    });
    const text = textFromMessage(msg);
    if (!text) throw new Error('Claude 応答にテキストがありません');
    return text;
  }

  // OpenRouter（OpenAI互換）
  const messages: { role: string; content: string }[] = [{ role: 'system', content: systemPrompt }];
  for (const t of clean) messages.push({ role: t.role, content: t.content });
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: openRouterHeaders(process.env.OPENROUTER_API_KEY!),
    body: JSON.stringify({ model: openRouterModel(model), max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text in OpenRouter response');
  return text;
}

/**
 * 単発生成（説明文・JSON抽出など）。既定は軽量モデル。
 * キー未設定時は現実的なモック日本語（デモ動作）を返す。
 */
export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string,
  model?: string,
  maxTokens: number = 1024,
): Promise<string> {
  const provider = aiProvider();
  const useModel = model ?? aiUtilityModel();

  if (!provider) {
    return 'こちらの車両は状態が良く、定期メンテナンスも施されております。ワンオーナー車で、内外装ともに綺麗な状態を保っております。走行距離も少なく、まだまだ長くお乗りいただけます。お気軽にお問い合わせください。';
  }

  if (provider === 'anthropic') {
    const msg = await getAnthropic().messages.create({
      model: useModel,
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    });
    const text = textFromMessage(msg);
    if (!text) throw new Error('No text in Claude response');
    return text;
  }

  // OpenRouter
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: openRouterHeaders(process.env.OPENROUTER_API_KEY!),
    body: JSON.stringify({ model: openRouterModel(useModel), max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text in OpenRouter response');
  return text;
}

export type VisionImage = { mediaType: string; dataBase64: string };

/** 画像つきで問い合わせる（車両状態のAI診断など）。AIキー必須。 */
export async function generateWithClaudeVision(
  prompt: string,
  images: VisionImage[],
  model?: string,
  maxTokens: number = 700,
): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new Error('AI キー（ANTHROPIC_API_KEY / OPENROUTER_API_KEY）が未設定です');
  const useModel = model ?? aiChatModel();

  if (provider === 'anthropic') {
    const content: Anthropic.ContentBlockParam[] = images.slice(0, 4).map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType as 'image/png', data: img.dataBase64 },
    }));
    content.push({ type: 'text', text: prompt });
    const msg = await getAnthropic().messages.create({
      model: useModel,
      max_tokens: maxTokens,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content }],
    });
    const text = textFromMessage(msg);
    if (!text) throw new Error('No text in Claude vision response');
    return text;
  }

  // OpenRouter
  const content: unknown[] = images.slice(0, 4).map((img) => ({
    type: 'image_url',
    image_url: { url: `data:${img.mediaType};base64,${img.dataBase64}` },
  }));
  content.push({ type: 'text', text: prompt });
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: openRouterHeaders(process.env.OPENROUTER_API_KEY!),
    body: JSON.stringify({ model: openRouterModel(useModel), max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`OpenRouter vision API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text in OpenRouter vision response');
  return text;
}
