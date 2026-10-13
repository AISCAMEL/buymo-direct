import { createClient } from '@/lib/supabase/server';

/** a と b の間にブロック関係があるか（どちら向きでも）。テーブル未導入時は false。 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('is_blocked_between', { a, b });
  if (error) return false;
  return data === true;
}

/** blocker が blocked をブロックしているか。 */
export async function hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  return !!data;
}
