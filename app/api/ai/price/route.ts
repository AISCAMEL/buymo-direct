import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { valuate } from '@/lib/valuation';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
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

  // 裏側で査定（AI優先・フォールバックで相場計算式）
  const r = await valuate({ maker, model, year, mileageKm: Number(mileage_km), condition });

  return NextResponse.json({
    price_low: r.lower,
    price_high: r.upper,
    reasoning: r.reasoning ?? '相場データと車両条件（年式・走行距離・状態）から算出した推定価格帯です。',
    source: r.source,
  });
}
