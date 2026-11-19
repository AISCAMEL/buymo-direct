import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyListingFilters } from '@/lib/listingQuery';
import { computeMarketStats } from '@/lib/market';
import { generateWithClaude, isAiEnabled } from '@/lib/ai';
import { buildComparePrompt, parseCompare, COMPARE_SYSTEM, type CompareVehicle } from '@/lib/market-compare';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// 市場価格くらべ：外部市場の相場をAIが推定し、BUYMOの実出品データと比較する。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<CompareVehicle>;
  const maker = (body.maker ?? '').trim();
  if (!maker) return NextResponse.json({ error: 'メーカーを入力してください' }, { status: 400 });
  const vehicle: CompareVehicle = {
    maker,
    model: (body.model ?? '').trim() || undefined,
    year: Number.isFinite(Number(body.year)) ? Number(body.year) : undefined,
    mileageKm: Number.isFinite(Number(body.mileageKm)) ? Number(body.mileageKm) : undefined,
  };

  // 1) BUYMOの自社出品から同条件の相場（実データ）
  let internal = null;
  try {
    const supabase = await createClient();
    const filter: Record<string, string | undefined> = { maker: vehicle.maker, model: vehicle.model };
    if (vehicle.year) { filter.year_min = String(vehicle.year - 2); filter.year_max = String(vehicle.year + 2); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from('listings').select('price, mileage_km, year').eq('status', 'active');
    query = applyListingFilters(query, filter);
    const { data } = await query.range(0, 999);
    const rows = (data ?? []) as { price: number | null; mileage_km: number | null; year: number | null }[];
    internal = computeMarketStats(rows, rows.length);
  } catch {
    internal = null;
  }

  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'ただいま相場AIは準備中です。少し時間をおいてお試しください。', internal }, { status: 200 });
  }

  // 2) 外部市場の相場をAIが推定 → 比較結果に整形
  try {
    const text = await generateWithClaude(buildComparePrompt(vehicle, internal), COMPARE_SYSTEM, undefined, 900);
    const result = parseCompare(text, internal);
    if (!result) return NextResponse.json({ error: '相場を取得できませんでした。もう一度お試しください。' }, { status: 200 });
    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: `相場の取得に失敗しました（${msg}）` }, { status: 200 });
  }
}
