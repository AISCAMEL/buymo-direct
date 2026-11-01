// OpenRouter による画像生成。コラムのサムネイル生成に使う。
// ユーザー指定により画像生成は OpenRouter を使用する。
//
// 環境変数:
//   OPENROUTER_API_KEY     … 必須
//   OPENROUTER_IMAGE_MODEL … 画像出力対応モデル（既定: google/gemini-2.5-flash-image-preview）
//
// OpenRouter は chat/completions で modalities に "image" を含めると画像を返す。
// レスポンス形状は複数あり得るため、寛容にパースする（message.images / data[].b64_json 等）。

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

/** data:image/png;base64,xxxx または 生のbase64 から {buffer, contentType} を得る。 */
function decodeImage(raw: string): GeneratedImage | null {
  if (!raw) return null;
  const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (m) {
    try {
      return { buffer: Buffer.from(m[2], 'base64'), contentType: m[1] };
    } catch {
      return null;
    }
  }
  // 生base64（データURIでない）
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 100) {
    try {
      return { buffer: Buffer.from(raw.replace(/\s/g, ''), 'base64'), contentType: 'image/png' };
    } catch {
      return null;
    }
  }
  return null;
}

/** レスポンスJSONから最初の画像を取り出す（複数の既知形状に対応）。 */
function extractImage(data: unknown): GeneratedImage | null {
  const d = data as Record<string, unknown>;

  // 1) chat/completions: choices[0].message.images[]
  const choices = d?.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const images = message?.images as unknown[] | undefined;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === 'string') {
        const got = decodeImage(img);
        if (got) return got;
      } else if (img && typeof img === 'object') {
        const o = img as Record<string, unknown>;
        const urlObj = o.image_url as Record<string, unknown> | undefined;
        const url = (urlObj?.url as string) ?? (o.url as string) ?? (o.b64_json as string) ?? (o.data as string);
        const got = url ? decodeImage(url) : null;
        if (got) return got;
      }
    }
  }

  // 2) images API 形状: data[].b64_json
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
 */
export async function generateImageOpenRouter(prompt: string): Promise<GeneratedImage | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
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
    if (!res.ok) return null;
    const data = await res.json();
    return extractImage(data);
  } catch {
    return null;
  }
}
