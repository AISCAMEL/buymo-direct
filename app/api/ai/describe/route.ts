import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWithClaude } from '@/lib/ai';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    maker?: string;
    model?: string;
    year?: number;
    mileage_km?: number;
    condition?: string;
    options?: string;
  };
  const { maker, model, year, mileage_km, condition, options } = body;

  if (!maker || !model || !year || mileage_km == null || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const prompt = `以下の中古車の出品説明文を200字以内の日本語で作成してください。

メーカー: ${maker}
モデル: ${model}
年式: ${year}年
走行距離: ${Number(mileage_km).toLocaleString('ja-JP')}km
コンディション: ${condition}
${options ? `特記事項: ${options}` : ''}

200字以内で簡潔に、購入者が魅力を感じる説明文を作成してください。余分な説明や前置きは不要です。説明文のみ返してください。`;

  const description = await generateWithClaude(prompt);
  return NextResponse.json({ description });
}
