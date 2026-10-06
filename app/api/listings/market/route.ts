import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyListingFilters } from '@/lib/listingQuery';
import { computeMarketStats } from '@/lib/market';

export const dynamic = 'force-dynamic';

/**
 * 出品時の価格ガイド用：同条件（メーカー・車種・年式±2年）の現役出品から相場を返す。
 * GET /api/listings/market?maker=&model=&year=
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const maker = sp.get('maker')?.trim();
  if (!maker) return NextResponse.json({ stats: null });

  const model = sp.get('model')?.trim() || undefined;
  const year = Number(sp.get('year'));

  const filter: Record<string, string | undefined> = { maker, model };
  if (Number.isFinite(year) && year > 1950) {
    filter.year_min = String(year - 2);
    filter.year_max = String(year + 2);
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('listings').select('price, mileage_km, year').eq('status', 'active');
  query = applyListingFilters(query, filter);
  const { data, error } = await query.range(0, 999);
  if (error) return NextResponse.json({ stats: null });

  const rows = (data ?? []) as { price: number | null; mileage_km: number | null; year: number | null }[];
  const stats = computeMarketStats(rows, rows.length);
  return NextResponse.json({ stats });
}
