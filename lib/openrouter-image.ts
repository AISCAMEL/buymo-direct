// OpenRouter による画像生成。コラムのサムネイル生成に使う。
// ユーザー指定により画像生成は OpenRouter を使用する。
//
// 環境変数:
//   OPENROUTER_API_KEY     … 必須
//   OPENROUTER_IMAGE_MODEL … 画像出力対応モデル（任意。既定: google/gemini-2.5-flash-image を筆頭に数モデルを順に試行）
//
// OpenRouter は chat/completions で modalities に "image" を含めると画像を返す。
// レスポンス形状は複数あり得るため、寛容にパースする（message.images / message.content / data[]）。

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type GeneratedImage = { buffer: Buffer; contentType: string };

function headers(apiKey: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'X-Title': 'BUYMO Direct',
  };
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) h['HTTP-Referer'] = site;
  return h;
}

/** data:image/...;base64,xxxx または 生base64 から {buffer, contentType} を得る。 */
function decodeImage(raw: unknown): GeneratedImage | null {
  if (typeof raw !== 'string' || !raw) return null;
  const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (m) {
    try {
      return { buffer: Buffer.from(m[2], 'base64'), contentType: m[1] };
    } catch {
      return null;
    }
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s/g, '').length > 100) {
    try {
      return { buffer: Buffer.from(raw.replace(/\s/g, ''), 'base64'), contentType: 'image/png' };
    } catch {
      return null;
    }
  }
  return null;
}

function fromImageItem(img: unknown): GeneratedImage | null {
  if (typeof img === 'string') return decodeImage(img);
  if (img && typeof img === 'object') {
    const o = img as Record<string, unknown>;
    const urlObj = o.image_url as Record<string, unknown> | undefined;
    const candidate =
      (urlObj?.url as string) ?? (o.url as string) ?? (o.b64_json as string) ?? (o.data as string) ?? (o.image as string);
    return decodeImage(candidate);
  }
  return null;
}

/** レスポンスJSONから最初の画像を取り出す（複数の既知形状に対応）。 */
function extractImage(data: unknown): GeneratedImage | null {
  const d = data as Record<string, unknown>;
  const choices = d?.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;

  // 1) message.images[]
  const images = message?.images as unknown[] | undefined;
  if (Array.isArray(images)) {
    for (const img of images) {
      const got = fromImageItem(img);
      if (got) return got;
    }
  }

  // 2) message.content が配列（OpenAI風マルチモーダル）: [{type:'image_url',image_url:{url}}]
  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === 'object') {
        const p = part as Record<string, unknown>;
        if (p.type === 'image_url' || p.type === 'image' || p.image_url || p.b64_json) {
          const got = fromImageItem(p);
          if (got) return got;
        }
      }
    }
  }

  // 3) images API 形状: data[].b64_json
  const dataArr = d?.data as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(dataArr)) {
    for (const item of dataArr) {
      const b64 = (item?.b64_json as string) ?? (item?.url as string);
      const media = (item?.media_type as string) ?? 'image/png';
      if (b64) {
        const got = decodeImage(b64.startsWith('data:') ? b64 : `data:${media};base64,${b64}`);
        if (got) return got;
      }
    }
  }

  return null;
}

export type ImageGenResult = { image: GeneratedImage | null; diagnostic: string; model: string };

/** 試行するモデルの候補（先頭から順に。env 指定があれば最優先）。
 *  OpenRouter で chat/completions（modalities:image）に対応する画像生成モデル。 */
function candidateModels(): string[] {
  const envModel = process.env.OPENROUTER_IMAGE_MODEL?.trim();
  const defaults = [
    'google/gemini-2.5-flash-image',   // Nano Banana（画像生成・2025/10〜）正式slug
    'google/gemini-3-pro-image',       // 新しい上位モデル（利用可能なら）
    'black-forest-labs/flux.2-flex',   // 予備（別系統）
  ];
  // env 指定を先頭に、重複を除外
  return [envModel, ...defaults].filter((m): m is string => !!m).filter((m, i, a) => a.indexOf(m) === i);
}

/** 1モデルで画像生成を1回試す。成功なら image、失敗なら理由を返す。 */
async function tryOneModel(prompt: string, model: string, apiKey: string): Promise<{ image: GeneratedImage | null; diagnostic: string }> {
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      const diag = `HTTP ${res.status}: ${bodyText.slice(0, 200)}`;
      console.error(`[openrouter-image] ${diag} model=${model}`);
      return { image: null, diagnostic: diag };
    }

    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      const diag = `JSON解析失敗: ${bodyText.slice(0, 160)}`;
      console.error(`[openrouter-image] ${diag} model=${model}`);
      return { image: null, diagnostic: diag };
    }

    const img = extractImage(data);
    if (!img) {
      const diag = `画像が返りませんでした（構造: ${JSON.stringify(topKeys(data)).slice(0, 200)}）`;
      console.error(`[openrouter-image] ${diag} model=${model} snippet=${bodyText.slice(0, 400)}`);
      return { image: null, diagnostic: diag };
    }
    return { image: img, diagnostic: '' };
  } catch (e) {
    const diag = `例外: ${e instanceof Error ? e.message : 'unknown'}`;
    console.error(`[openrouter-image] ${diag} model=${model}`);
    return { image: null, diagnostic: diag };
  }
}

/**
 * OpenRouter で画像を1枚生成する。複数モデルを順に試し、最初に成功したものを返す。
 * すべて失敗なら image=null＋diagnostic（最後の理由とモデル）。
 */
export async function generateImageOpenRouter(prompt: string): Promise<ImageGenResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const models = candidateModels();
  if (!apiKey) {
    return { image: null, diagnostic: 'OPENROUTER_API_KEY が未設定です', model: models[0] };
  }

  const tried: string[] = [];
  let lastDiag = '不明';
  for (const model of models) {
    tried.push(model);
    const { image, diagnostic } = await tryOneModel(prompt, model, apiKey);
    if (image) return { image, diagnostic: '', model };
    lastDiag = diagnostic;
    // モデル未対応/権限なし系は次の候補へ。レート制限(429)は打ち切り。
    if (/HTTP 429/.test(diagnostic)) break;
  }
  return { image: null, diagnostic: `${lastDiag}（試行: ${tried.join(', ')}）`, model: tried[tried.length - 1] };
}

/** レスポンスの大まかな構造（キー）を返す（ログ用）。 */
function topKeys(data: unknown): unknown {
  const d = data as Record<string, unknown>;
  const message = (d?.choices as Array<Record<string, unknown>> | undefined)?.[0]?.message as Record<string, unknown> | undefined;
  return {
    top: d ? Object.keys(d) : null,
    messageKeys: message ? Object.keys(message) : null,
    contentType: message ? typeof message.content : null,
    hasImages: Array.isArray(message?.images),
    error: d?.error ?? null,
  };
}
