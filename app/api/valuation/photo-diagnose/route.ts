import { NextResponse } from 'next/server';
import { generateWithClaudeVision, isAiEnabled, type VisionImage } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 写真からの車両状態AI診断（公開・画像はbase64で受け取り保存しない）。
export async function POST(req: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json({ available: false, error: 'AI画像診断は現在ご利用いただけません。' }, { status: 200 });
  }

  const body = (await req.json().catch(() => ({}))) as { images?: { mediaType?: string; dataBase64?: string }[] };
  const raw = Array.isArray(body.images) ? body.images : [];
  const images: VisionImage[] = raw
    .filter((i) => typeof i?.dataBase64 === 'string' && i.dataBase64.length > 0)
    .map((i) => ({
      mediaType: ['image/jpeg', 'image/png', 'image/webp'].includes(i.mediaType ?? '') ? (i.mediaType as string) : 'image/jpeg',
      dataBase64: i.dataBase64 as string,
    }))
    .slice(0, 3);

  if (images.length === 0) {
    return NextResponse.json({ available: true, error: '画像が読み取れませんでした。' }, { status: 400 });
  }

  const prompt = `あなたは中古車の査定士です。アップロードされた車両写真から、外装・内装の状態を推定してください。写真に写っている範囲のみから、客観的に判断します（写っていない部分は推測で断定しない）。

次のJSONのみで返答（説明・コードブロック不要）:
{"condition": "excellent" または "good" または "fair", "accident_hint": "none" または "possible" または "unknown", "summary": "全体所見(日本語60字以内)", "points": ["気づいた点(各30字以内, 最大4件)"]}
condition は excellent=無事故・非常にきれい / good=一般的 / fair=傷・使用感が目立つ。accident_hint は写真から事故・修復の疑いがあれば possible。`;

  try {
    const text = await generateWithClaudeVision(prompt, images);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ available: true, error: '診断結果を解析できませんでした。' }, { status: 200 });
    const p = JSON.parse(match[0]) as { condition?: unknown; accident_hint?: unknown; summary?: unknown; points?: unknown };
    const condition = (['excellent', 'good', 'fair'] as const).includes(p.condition as 'good') ? (p.condition as 'excellent' | 'good' | 'fair') : 'good';
    const accidentHint = (['none', 'possible', 'unknown'] as const).includes(p.accident_hint as 'none') ? (p.accident_hint as 'none' | 'possible' | 'unknown') : 'unknown';
    const points = Array.isArray(p.points) ? p.points.filter((x) => typeof x === 'string').slice(0, 4) : [];
    return NextResponse.json({
      available: true,
      condition,
      accidentHint,
      summary: typeof p.summary === 'string' ? p.summary : '',
      points,
    });
  } catch {
    return NextResponse.json({ available: true, error: 'AI画像診断に失敗しました。時間をおいて再度お試しください。' }, { status: 200 });
  }
}
