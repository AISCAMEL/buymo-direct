import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListingWithImages } from '@/lib/types';
import { RELATED_MODELS } from '@/lib/constants';

type SeedListing = {
  id: string;
  maker: string;
  model: string;
  body_type: string | null;
  price: number;
};

/**
 * 類似・関連のおすすめ車両を返す。
 * 同じ車種＞兄弟/競合モデル＞同メーカー＞同ボディ、さらに価格の近さでスコアリング。
 */
export async function getRelatedListings(
  supabase: SupabaseClient,
  listing: SeedListing,
  limit = 6,
): Promise<ListingWithImages[]> {
  const related = RELATED_MODELS[listing.model] ?? [];

  // 候補プール：同メーカー or 同ボディ or 関連モデル（active・自分以外）
  const ors = [`maker.eq.${listing.maker}`];
  if (listing.body_type) ors.push(`body_type.eq.${listing.body_type}`);
  for (const m of related) ors.push(`model.eq.${m}`);

  const { data } = await supabase
    .from('listings')
    .select('*, listing_images(url, sort_order)')
    .eq('status', 'active')
    .neq('id', listing.id)
    .or(ors.join(','))
    .limit(48);

  const rows = (data ?? []) as unknown as ListingWithImages[];
  const base = listing.price || 1;

  const score = (l: ListingWithImages): number => {
    let s = 0;
    if (l.maker === listing.maker && l.model === listing.model) s += 100;
    else if (l.maker === listing.maker && related.includes(l.model)) s += 65;
    else if (related.includes(l.model)) s += 55;
    else if (l.maker === listing.maker) s += 25;
    if (listing.body_type && l.body_type === listing.body_type) s += 15;
    const diff = Math.abs((l.price || 0) - base) / base;
    if (diff <= 0.2) s += 12;
    else if (diff <= 0.4) s += 6;
    if (l.boosted_until && new Date(l.boosted_until) > new Date()) s += 5;
    return s;
  };

  return rows.sort((a, b) => score(b) - score(a)).slice(0, limit);
}
