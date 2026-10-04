import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';

export type ListingActivity = {
  views: number;
  inquiriesTotal: number;
  inquiriesToday: number;
  favorites: number;
  reserved: boolean;
};

/**
 * 出品の“動き”を集計する（閲覧・お問い合わせ・お気に入り・商談中）。
 * conversations / favorites は当事者限定RLSのため、件数集計は service role で行う（件数のみ・内容は返さない）。
 * 失敗しても画面を壊さないよう握りつぶして0を返す。
 */
export async function getListingActivity(
  listingId: string,
  opts?: { views?: number; status?: string }
): Promise<ListingActivity> {
  const base: ListingActivity = {
    views: Math.max(0, opts?.views ?? 0),
    inquiriesTotal: 0,
    inquiriesToday: 0,
    favorites: 0,
    reserved: opts?.status === 'reserved',
  };
  try {
    const svc = createServiceClient();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayIso = start.toISOString();

    const [inqTotal, inqToday, favs] = await Promise.all([
      svc.from('conversations').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
      svc.from('conversations').select('id', { count: 'exact', head: true }).eq('listing_id', listingId).gte('created_at', todayIso),
      svc.from('favorites').select('listing_id', { count: 'exact', head: true }).eq('listing_id', listingId),
    ]);
    base.inquiriesTotal = inqTotal.count ?? 0;
    base.inquiriesToday = inqToday.count ?? 0;
    base.favorites = favs.count ?? 0;
  } catch {
    /* 集計失敗は無視（0のまま） */
  }
  return base;
}

/** 件数が「注目」と言えるかの簡易しきい値。 */
export function isHotListing(a: { views: number; inquiriesTotal: number; favorites: number }): boolean {
  return a.views >= 50 || a.inquiriesTotal >= 3 || a.favorites >= 5;
}

/**
 * 一覧用：複数出品の「本日のお問い合わせ件数」を一括集計して {listingId: 件数} を返す。
 * conversations は当事者限定RLSのため service role で件数のみ集計。失敗時は空。
 */
export async function getTodayInquiryMap(listingIds: string[]): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const ids = Array.from(new Set(listingIds.filter(Boolean)));
  if (ids.length === 0) return map;
  try {
    const svc = createServiceClient();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data } = await svc
      .from('conversations')
      .select('listing_id')
      .in('listing_id', ids)
      .gte('created_at', start.toISOString());
    for (const row of (data ?? []) as { listing_id: string | null }[]) {
      if (row.listing_id) map[row.listing_id] = (map[row.listing_id] ?? 0) + 1;
    }
  } catch {
    /* 集計失敗は無視（空のまま） */
  }
  return map;
}
