'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const BOOST_OPTIONS: Record<string, { days: number; label: string; price: number }> = {
  '3days': { days: 3, label: '3日間', price: 500 },
  '7days': { days: 7, label: '7日間', price: 1000 },
  '30days': { days: 30, label: '30日間', price: 2500 },
};

/** ブースト適用（デモ: 無課金、本番は Square 決済要）。 */
export async function boostListing(
  listingId: string,
  plan: string
): Promise<void> {
  const opt = BOOST_OPTIONS[plan];
  if (!opt) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id, boosted_until')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing || listing.seller_id !== user.id) return;

  // 既存の有効なブーストがあれば延長、なければ今から起算
  const base = listing.boosted_until && new Date(listing.boosted_until) > new Date()
    ? new Date(listing.boosted_until)
    : new Date();
  base.setDate(base.getDate() + opt.days);
  const boosted_until = base.toISOString();

  await supabase
    .from('listings')
    .update({ boosted_until })
    .eq('id', listingId)
    .eq('seller_id', user.id);

  revalidatePath(`/dashboard/listings`);
  redirect(`/dashboard/listings?boosted=${listingId}`);
}
