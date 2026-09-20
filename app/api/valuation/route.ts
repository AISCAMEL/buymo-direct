import { NextResponse } from 'next/server';
import { valuate } from '@/lib/valuation';

// 公開の無料査定エンドポイント（裏側で査定して結果を返す）。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    maker?: string;
    model?: string;
    year?: number;
    mileageKm?: number;
    condition?: string;
  };

  const maker = String(body.maker ?? '').trim();
  const year = Number(body.year);
  const mileageKm = Number(body.mileageKm);
  const condition = String(body.condition ?? 'good');

  if (!maker || !Number.isFinite(year) || !Number.isFinite(mileageKm) || mileageKm < 0) {
    return NextResponse.json({ error: 'メーカー・年式・走行距離を確認してください' }, { status: 400 });
  }

  const result = await valuate({
    maker,
    model: body.model ? String(body.model).trim() : undefined,
    year,
    mileageKm,
    condition,
  });

  return NextResponse.json(result);
}
