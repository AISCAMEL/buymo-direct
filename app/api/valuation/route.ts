import { NextResponse } from 'next/server';
import { valuate, logValuation } from '@/lib/valuation';
import { createClient } from '@/lib/supabase/server';

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

  const input = {
    maker,
    model: body.model ? String(body.model).trim() : undefined,
    year,
    mileageKm,
    condition,
  };
  const result = await valuate(input);

  // ログイン中ならユーザー紐付け（任意）→ 履歴保存（ベストエフォート）
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* 未ログインでも可 */
  }
  await logValuation(input, result, userId);

  return NextResponse.json(result);
}
