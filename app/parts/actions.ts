'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import {
  minNextBid,
  type PartCategory,
  type PartAuction,
} from '@/lib/part-auction';

function toCategory(v: string): PartCategory {
  const ok: PartCategory[] = ['wheel', 'tire', 'nav', 'aero', 'audio', 'exterior', 'interior', 'other'];
  return (ok as string[]).includes(v) ? (v as PartCategory) : 'other';
}

/** パーツをオークション出品する。 */
export async function createPartAuction(formData: FormData): Promise<{ ok: boolean; error?: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/parts/new');

  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const category = toCategory(String(formData.get('category') || 'other'));
  const item_condition = String(formData.get('item_condition') || 'used') === 'new' ? 'new' : 'used';
  const startPrice = Math.max(0, Math.round(Number(formData.get('start_price')) || 0));
  const buyNowRaw = Math.round(Number(formData.get('buy_now_price')) || 0);
  const buy_now_price = buyNowRaw > 0 ? buyNowRaw : null;
  const days = [1, 3, 5, 7].includes(Number(formData.get('duration'))) ? Number(formData.get('duration')) : 3;
  let images: string[] = [];
  try { images = JSON.parse(String(formData.get('images') || '[]')); } catch { images = []; }
  images = Array.isArray(images) ? images.filter((u) => typeof u === 'string').slice(0, 10) : [];

  if (!title) return { ok: false, error: '商品名を入力してください。' };
  if (buy_now_price && buy_now_price < startPrice) return { ok: false, error: '即決価格は開始価格以上にしてください。' };

  const ends_at = new Date(Date.now() + days * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('part_auctions')
    .insert({
      seller_id: user.id,
      title,
      description,
      category,
      item_condition,
      images,
      start_price: startPrice,
      buy_now_price,
      current_price: startPrice,
      ends_at,
      status: 'active',
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? '出品に失敗しました' };

  redirect(`/parts/${data.id}`);
}

/** 入札する。 */
export async function placeBid(formData: FormData): Promise<void> {
  const auctionId = String(formData.get('auction_id') || '');
  const amount = Math.round(Number(formData.get('amount')) || 0);
  if (!auctionId || amount <= 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  const svc = createServiceClient();
  const { data: a } = await svc.from('part_auctions').select('*').eq('id', auctionId).maybeSingle();
  const au = a as PartAuction | null;
  if (!au || au.status !== 'active') return;
  if (new Date(au.ends_at).getTime() <= Date.now()) return;
  if (au.seller_id === user.id) return; // 自分の商品には入札不可

  const minBid = minNextBid(au.current_price, au.bid_count, au.start_price);
  if (amount < minBid) return;

  const prevHighest = au.highest_bidder_id;

  // 入札を記録（本人のみ・RLS）
  const { error: bidErr } = await supabase.from('part_bids').insert({ auction_id: auctionId, bidder_id: user.id, amount });
  if (bidErr) return;

  // 即決価格に到達したら落札確定
  const reachedBuyNow = au.buy_now_price != null && amount >= au.buy_now_price;
  await svc
    .from('part_auctions')
    .update({
      current_price: amount,
      bid_count: au.bid_count + 1,
      highest_bidder_id: user.id,
      ...(reachedBuyNow ? { status: 'sold', winner_id: user.id, closed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId);

  // 以前の最高入札者へ「上回られました」通知
  if (prevHighest && prevHighest !== user.id) {
    await createNotification(prevHighest, 'system', '入札が上回られました', `「${au.title}」で他の方が上回る入札をしました。`, `/parts/${auctionId}`);
  }
  if (reachedBuyNow) {
    await createNotification(au.seller_id, 'system', '落札されました', `「${au.title}」が ¥${amount.toLocaleString()} で落札されました。`, `/parts/${auctionId}`);
    await createNotification(user.id, 'system', '落札しました', `「${au.title}」を ¥${amount.toLocaleString()} で落札しました。出品者と取引を進めてください。`, `/parts/${auctionId}`);
  }

  revalidatePath(`/parts/${auctionId}`);
}

/** 即決購入する。 */
export async function buyNow(formData: FormData): Promise<void> {
  const auctionId = String(formData.get('auction_id') || '');
  if (!auctionId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  const svc = createServiceClient();
  const { data: a } = await svc.from('part_auctions').select('*').eq('id', auctionId).maybeSingle();
  const au = a as PartAuction | null;
  if (!au || au.status !== 'active' || au.buy_now_price == null) return;
  if (new Date(au.ends_at).getTime() <= Date.now()) return;
  if (au.seller_id === user.id) return;

  const price = au.buy_now_price;
  const { error: bidErr } = await supabase.from('part_bids').insert({ auction_id: auctionId, bidder_id: user.id, amount: price });
  if (bidErr) return;

  await svc
    .from('part_auctions')
    .update({
      current_price: price,
      bid_count: au.bid_count + 1,
      highest_bidder_id: user.id,
      status: 'sold',
      winner_id: user.id,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId);

  await createNotification(au.seller_id, 'system', '即決で落札されました', `「${au.title}」が即決 ¥${price.toLocaleString()} で落札されました。`, `/parts/${auctionId}`);
  await createNotification(user.id, 'system', '即決で落札しました', `「${au.title}」を ¥${price.toLocaleString()} で落札しました。出品者と取引を進めてください。`, `/parts/${auctionId}`);

  revalidatePath(`/parts/${auctionId}`);
}

/** 出品を取り消す（入札が無い場合のみ・出品者本人）。 */
export async function cancelPartAuction(formData: FormData): Promise<void> {
  const auctionId = String(formData.get('auction_id') || '');
  if (!auctionId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('part_auctions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', auctionId)
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .eq('bid_count', 0);
  revalidatePath(`/parts/${auctionId}`);
}

/** 終了時刻を過ぎたオークションを確定する（閲覧時の遅延クローズ）。 */
export async function closePartAuctionIfEnded(auctionId: string): Promise<void> {
  const svc = createServiceClient();
  const { data: a } = await svc.from('part_auctions').select('*').eq('id', auctionId).maybeSingle();
  const au = a as PartAuction | null;
  if (!au || au.status !== 'active') return;
  if (new Date(au.ends_at).getTime() > Date.now()) return;

  const sold = au.bid_count > 0 && au.highest_bidder_id;
  await svc
    .from('part_auctions')
    .update({
      status: sold ? 'sold' : 'ended',
      winner_id: sold ? au.highest_bidder_id : null,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId)
    .eq('status', 'active');

  if (sold && au.highest_bidder_id) {
    await createNotification(au.highest_bidder_id, 'system', '落札しました', `「${au.title}」を ¥${au.current_price.toLocaleString()} で落札しました。`, `/parts/${auctionId}`);
    await createNotification(au.seller_id, 'system', '落札されました', `「${au.title}」が ¥${au.current_price.toLocaleString()} で落札されました。`, `/parts/${auctionId}`);
  }
}
