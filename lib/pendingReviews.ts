import type { SupabaseClient } from '@supabase/supabase-js';

/** 自分がまだ評価していない取引完了件数を返す。 */
export async function pendingReviewCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: escrows } = await supabase
    .from('escrow_transactions')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .eq('status', 'completed');

  if (!escrows?.length) return 0;

  const escrowIds = escrows.map((e) => e.id);

  const { data: myReviews } = await supabase
    .from('reviews')
    .select('escrow_id')
    .eq('reviewer_id', userId)
    .in('escrow_id', escrowIds);

  const reviewedIds = new Set((myReviews ?? []).map((r) => r.escrow_id));
  return escrowIds.filter((id) => !reviewedIds.has(id)).length;
}
