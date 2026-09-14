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
  };
  const { maker, model, year, mileage_km, condition } = body;

  if (!maker || !model || !year || mileage_km == null || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const prompt = `以下の中古車の適正な査定価格帯を提案してください。必ずJSON形式のみで返答してください。

メーカー: ${maker}
モデル: ${model}
年式: ${year}年
走行距離: ${Number(mileage_km).toLocaleString('ja-JP')}km
コンディション: ${condition}

以下のJSON形式のみで返答してください（説明文・前置き・コードブロック記号は不要）:
{"price_low": 数値, "price_high": 数値, "reasoning": "査定理由（日本語100字以内）"}

price_lowとprice_highは円単位の整数です。`;

  const text = await generateWithClaude(prompt);

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
  }

  let parsed: { price_low?: unknown; price_high?: unknown; reasoning?: unknown };
  try {
    parsed = JSON.parse(match[0]) as { price_low?: unknown; price_high?: unknown; reasoning?: unknown };
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  return NextResponse.json({
    price_low: Number(parsed.price_low),
    price_high: Number(parsed.price_high),
    reasoning: String(parsed.reasoning ?? ''),
  });
}
