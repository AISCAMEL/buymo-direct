// OpenRouter による画像生成。コラムのサムネイル生成に使う。
// ユーザー指定により画像生成は OpenRouter を使用する。
//
// 環境変数:
//   OPENROUTER_API_KEY     … 必須
//   OPENROUTER_IMAGE_MODEL … 画像出力対応モデル（既定: google/gemini-2.5-flash-image-preview）
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

/**
 * OpenRouter で画像を1枚生成する。失敗時は null（呼び出し側は画像なしで続行）。
 * 失敗理由は console に出す（Vercelログで診断可能にする）。
 */
export async function generateImageOpenRouter(prompt: string): Promise<GeneratedImage | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[openrouter-image] OPENROUTER_API_KEY 未設定');
    return null;
  }
  const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview';

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
      console.error(`[openrouter-image] HTTP ${res.status} model=${model} body=${bodyText.slice(0, 500)}`);
      return null;
    }

    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      console.error(`[openrouter-image] JSON解析失敗 body=${bodyText.slice(0, 300)}`);
      return null;
    }

    const img = extractImage(data);
    if (!img) {
      // 画像が取り出せない → レスポンス構造をログに出して原因特定できるようにする
      console.error(`[openrouter-image] 画像抽出失敗 model=${model} keys=${JSON.stringify(topKeys(data))} snippet=${bodyText.slice(0, 500)}`);
      return null;
    }
    return img;
  } catch (e) {
    console.error(`[openrouter-image] 例外: ${e instanceof Error ? e.message : 'unknown'}`);
    return null;
  }
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
