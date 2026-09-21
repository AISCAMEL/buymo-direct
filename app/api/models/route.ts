import { NextResponse } from 'next/server';
import { getModelSuggestions } from '@/lib/models';

// メーカーに応じた車名候補を返す（フォームが呼ぶ）。CDNでキャッシュ。
export async function GET(req: Request) {
  const maker = new URL(req.url).searchParams.get('maker')?.trim() ?? '';
  if (!maker) return NextResponse.json({ models: [] });

  const models = await getModelSuggestions(maker);
  return NextResponse.json(
    { models },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
