'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ListingStatus } from '@/lib/types';

/** 出品詳細から売主に問い合わせる：会話を作成（または既存を取得）してスレッドへ遷移。 */
export async function startConversation(formData: FormData) {
  const listingId = String(formData.get('listing_id'));
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/listings/${listingId}`);

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', listingId)
    .single();
  if (!listing) redirect('/listings');

  // 自分の出品には問い合わせ不可
  if (listing.seller_id === user!.id) redirect(`/listings/${listingId}`);

  // 既存スレッドを探す
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user!.id)
    .maybeSingle();

  if (existing) redirect(`/messages/${existing.id}`);

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: user!.id, seller_id: listing.seller_id })
    .select('id')
    .single();

  if (error || !created) redirect(`/listings/${listingId}?error=conversation`);
  redirect(`/messages/${created.id}`);
}

/** 出品ステータスを変更（売主のみ）。取り下げ=closed / 再出品=active。 */
export async function setListingStatus(listingId: string, status: ListingStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/listings/${listingId}`);

  // RLS（listings_update_own）により他人の出品は更新できない
  await supabase
    .from('listings')
    .update({ status })
    .eq('id', listingId)
    .eq('seller_id', user.id);

  revalidatePath(`/listings/${listingId}`);
  revalidatePath('/dashboard/listings');
}

/** 出品を削除（売主のみ）。Storage上の画像もベストエフォートで削除。 */
export async function deleteListing(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/listings/${listingId}`);

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing || listing.seller_id !== user.id) redirect('/dashboard/listings');

  // Storage の画像オブジェクトを公開URLからパスを復元して削除
  const { data: images } = await supabase
    .from('listing_images')
    .select('url')
    .eq('listing_id', listingId);
  const marker = '/listing-images/';
  const paths = (images ?? [])
    .map((img: { url: string }) => {
      const i = img.url.indexOf(marker);
      return i >= 0 ? img.url.slice(i + marker.length) : null;
    })
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabase.storage.from('listing-images').remove(paths);
  }

  // listing_images / conversations / escrow は FK の on delete cascade で消える
  await supabase.from('listings').delete().eq('id', listingId).eq('seller_id', user.id);

  revalidatePath('/dashboard/listings');
  redirect('/dashboard/listings');
}
