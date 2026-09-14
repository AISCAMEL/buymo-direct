// Returns the set of listing IDs (from `ids`) that the given user has favorited.
// `supabase` is the loosely-typed server client from lib/supabase/server.
export async function favoritedSet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string | undefined,
  ids: string[]
): Promise<Set<string>> {
  if (!userId || ids.length === 0) return new Set();
  const { data } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', ids);
  return new Set((data ?? []).map((f: { listing_id: string }) => f.listing_id));
}
