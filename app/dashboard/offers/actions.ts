'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ESCROW_FEE, TITLE_OPTIONS } from '@/lib/constants';

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** 買主がオファーを提示（1 出品につき 1 件のみ）。 */
export async function makeOffer(
  listingId: string,
  amount: number,
  message: string
): Promise<{ error: string | null }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: '未ログインです' };
  if (amount <= 0) return { error: '金額を入力してください' };

  // 出品の確認
  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id, status, price')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing) return { error: '出品が見つかりません' };
  if (listing.status !== 'active') return { error: 'この出品は現在受付できません' };
  if (listing.seller_id === user.id) return { error: '自分の出品にはオファーできません' };

  const { error } = await supabase.from('offers').upsert(
    {
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount,
      message: message.trim() || null,
      status: 'pending',
      counter_amount: null,
      counter_message: null,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id,buyer_id' }
  );
  if (error) return { error: error.message };

  revalidatePath(`/listings/${listingId}`);
  revalidatePath('/dashboard/offers');
  return { error: null };
}

/** 売主がオファーを承認 → 会話を作成しエスクロー開始。 */
export async function sellerAcceptOffer(offerId: string): Promise<{ error: string | null; escrowId?: string }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: '未ログインです' };

  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .eq('seller_id', user.id)
    .maybeSingle();
  if (!offer) return { error: 'オファーが見つかりません' };
  if (offer.status !== 'pending') return { error: 'このオファーは操作できません' };

  const agreedAmount = offer.amount;

  // 会話を検索または作成
  let convId: string;
  const { data: existConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', offer.listing_id)
    .eq('buyer_id', offer.buyer_id)
    .maybeSingle();

  if (existConv) {
    convId = existConv.id;
  } else {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        listing_id: offer.listing_id,
        buyer_id: offer.buyer_id,
        seller_id: user.id,
      })
      .select('id')
      .single();
    if (convErr || !newConv) return { error: '会話の作成に失敗しました' };
    convId = newConv.id;
  }

  // エスクロー取引を作成（合意額で）
  const { data: escrow, error: escrowErr } = await supabase
    .from('escrow_transactions')
    .insert({
      listing_id: offer.listing_id,
      conversation_id: convId,
      buyer_id: offer.buyer_id,
      seller_id: user.id,
      amount: agreedAmount,
      escrow_fee: ESCROW_FEE,
      title_option: 'standard',
      title_fee: TITLE_OPTIONS.standard.fee,
      status: 'initiated',
    })
    .select('id')
    .single();
  if (escrowErr || !escrow) return { error: 'エスクロー取引の作成に失敗しました' };

  // オファーを承認済みに更新
  await supabase
    .from('offers')
    .update({ status: 'accepted', conversation_id: convId, updated_at: new Date().toISOString() })
    .eq('id', offerId);

  // 出品を商談中に
  await supabase.from('listings').update({ status: 'reserved' }).eq('id', offer.listing_id);

  // 会話に承認メッセージを投稿
  await supabase.from('messages').insert({
    conversation_id: convId,
    sender_id: user.id,
    body: `✅ オファーが成立しました（合意額：¥${agreedAmount.toLocaleString()}）。エスクロー取引に進んでください。`,
  });

  revalidatePath('/dashboard/offers');
  revalidatePath(`/escrow/${escrow.id}`);
  return { error: null, escrowId: escrow.id };
}

/** 売主がオファーを拒否。 */
export async function sellerRejectOffer(offerId: string): Promise<{ error: string | null }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: '未ログインです' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .eq('seller_id', user.id)
    .eq('status', 'pending');

  if (error) return { error: error.message };
  revalidatePath('/dashboard/offers');
  return { error: null };
}

/** 売主が反対提示。 */
export async function sellerCounterOffer(
  offerId: string,
  counterAmount: number,
  counterMessage: string
): Promise<{ error: string | null }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: '未ログインです' };
  if (counterAmount <= 0) return { error: '反対提示額を入力してください' };

  const { error } = await supabase
    .from('offers')
    .update({
      status: 'countered',
      counter_amount: counterAmount,
      counter_message: counterMessage.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .eq('seller_id', user.id)
    .eq('status', 'pending');

  if (error) return { error: error.message };
  revalidatePath('/dashboard/offers');
  return { error: null };
}

/** 買主が反対提示を承諾 → エスクロー開始。 */
export async function buyerAcceptCounter(offerId: string): Promise<{ error: string | null; escrowId?: string }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: '未ログインです' };

  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .eq('buyer_id', user.id)
    .eq('status', 'countered')
    .maybeSingle();
  if (!offer || !offer.counter_amount) return { error: 'オファーが見つかりません' };

  const agreedAmount = offer.counter_amount;

  // 会話を検索または作成
  let convId: string;
  const { data: existConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', offer.listing_id)
    .eq('buyer_id', user.id)
    .maybeSingle();

  if (existConv) {
    convId = existConv.id;
  } else {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        listing_id: offer.listing_id,
        buyer_id: user.id,
        seller_id: offer.seller_id,
      })
      .select('id')
      .single();
    if (convErr || !newConv) return { error: '会話の作成に失敗しました' };
    convId = newConv.id;
  }

  // エスクロー取引を作成（反対提示額で）
  const { data: escrow, error: escrowErr } = await supabase
    .from('escrow_transactions')
    .insert({
      listing_id: offer.listing_id,
      conversation_id: convId,
      buyer_id: user.id,
      seller_id: offer.seller_id,
      amount: agreedAmount,
      escrow_fee: ESCROW_FEE,
      title_option: 'standard',
      title_fee: TITLE_OPTIONS.standard.fee,
      status: 'initiated',
    })
    .select('id')
    .single();
  if (escrowErr || !escrow) return { error: 'エスクロー取引の作成に失敗しました' };

  await supabase
    .from('offers')
    .update({ status: 'accepted', conversation_id: convId, updated_at: new Date().toISOString() })
    .eq('id', offerId);

  await supabase.from('listings').update({ status: 'reserved' }).eq('id', offer.listing_id);

  await supabase.from('messages').insert({
    conversation_id: convId,
    sender_id: user.id,
    body: `✅ 反対提示を承諾しました（合意額：¥${agreedAmount.toLocaleString()}）。エスクロー取引に進んでください。`,
  });

  revalidatePath('/dashboard/offers');
  return { error: null, escrowId: escrow.id };
}

/** 買主がオファーまたは反対提示を拒否・キャンセル。 */
export async function buyerCancelOffer(offerId: string): Promise<{ error: string | null }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: '未ログインです' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'countered']);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/offers');
  return { error: null };
}
