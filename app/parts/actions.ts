'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import {
  type PartCategory,
} from '@/lib/part-auction';

function toCategory(v: string): PartCategory {
  const ok: PartCategory[] = ['wheel', 'tire', 'nav', 'aero', 'audio', 'exterior', 'interior', 'other'];
  return (ok as string[]).includes(v) ? (v as PartCategory) : 'other';
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const n = Math.round(Number(v) || 0);
  return n > 0 ? n : null;
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
  const buy_now_price = intOrNull(formData.get('buy_now_price'));
  const reserve_price = intOrNull(formData.get('reserve_price'));
  const days = [1, 3, 5, 7].includes(Number(formData.get('duration'))) ? Number(formData.get('duration')) : 3;
  const fit_maker = String(formData.get('fit_maker') || '').trim() || null;
  const fit_model = String(formData.get('fit_model') || '').trim() || null;
  const fit_year_from = intOrNull(formData.get('fit_year_from'));
  const fit_year_to = intOrNull(formData.get('fit_year_to'));
  let images: string[] = [];
  try { images = JSON.parse(String(formData.get('images') || '[]')); } catch { images = []; }
  images = Array.isArray(images) ? images.filter((u) => typeof u === 'string').slice(0, 10) : [];

  if (!title) return { ok: false, error: '商品名を入力してください。' };
  if (reserve_price && reserve_price < startPrice) return { ok: false, error: '最低落札価格は開始価格以上にしてください。' };
  if (buy_now_price && buy_now_price < startPrice) return { ok: false, error: '即決価格は開始価格以上にしてください。' };
  if (buy_now_price && reserve_price && buy_now_price < reserve_price) return { ok: false, error: '即決価格は最低落札価格以上にしてください。' };

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
      reserve_price,
      current_price: startPrice,
      fit_maker,
      fit_model,
      fit_year_from,
      fit_year_to,
      ends_at,
      status: 'active',
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? '出品に失敗しました' };

  redirect(`/parts/${data.id}`);
}

/** 入札する（代理入札対応）。入力額を上限として、最小額で自動的にリードする。 */
export async function placeBid(formData: FormData): Promise<{ ok: boolean; error?: string; info?: string } | void> {
  const auctionId = String(formData.get('auction_id') || '');
  const amount = Math.round(Number(formData.get('amount')) || 0);
  // 代理入札の上限（任意。未指定なら amount をそのまま上限に）
  const maxRaw = Math.round(Number(formData.get('max_amount')) || 0);
  const maxAmount = maxRaw > 0 ? Math.max(maxRaw, amount) : null;
  if (!auctionId || amount <= 0) return { ok: false, error: '入札額を入力してください。' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  const { data, error } = await supabase.rpc('place_part_bid', {
    p_auction_id: auctionId,
    p_amount: amount,
    p_max: maxAmount,
  });
  if (error) return { ok: false, error: '入札できませんでした。時間をおいて再度お試しください。' };
  const res = (data ?? {}) as {
    ok: boolean; error?: string; new_price?: number; leader_id?: string;
    you_lead?: boolean; prev_leader?: string | null; reached_buy_now?: boolean;
    extended?: boolean; reserve_met?: boolean; seller_id?: string; title?: string;
  };
  if (!res.ok) {
    if (res.error === 'login') redirect(`/login?redirect=/parts/${auctionId}`);
    return { ok: false, error: res.error ?? '入札できませんでした。' };
  }

  const price = res.new_price ?? amount;
  // 通知はベストエフォート（失敗しても入札は成立済み）
  try {
    const title = res.title ?? '出品商品';
    // 上回られた前リーダーへ通知
    if (res.prev_leader && res.prev_leader !== user.id && res.prev_leader !== res.leader_id) {
      await createNotification(res.prev_leader, 'system', '入札が上回られました', `「${title}」で他の方が上回りました。現在 ¥${price.toLocaleString()}。`, `/parts/${auctionId}`);
    }
    if (res.reached_buy_now && res.seller_id && res.leader_id) {
      await createNotification(res.seller_id, 'system', '落札されました', `「${title}」が ¥${price.toLocaleString()} で落札されました。`, `/parts/${auctionId}`);
      await createNotification(res.leader_id, 'system', '落札しました', `「${title}」を ¥${price.toLocaleString()} で落札しました。出品者と取引を進めてください。`, `/parts/${auctionId}`);
    }
  } catch { /* 通知失敗は無視 */ }

  revalidatePath(`/parts/${auctionId}`);
  let info: string | undefined;
  if (res.reached_buy_now) {
    info = `即決価格に到達し、あなたが落札しました（¥${price.toLocaleString()}）。`;
  } else if (res.you_lead) {
    info = res.reserve_met === false
      ? `入札しました（現在 ¥${price.toLocaleString()}）。ただし最低落札価格に未達のため、まだ落札は確定しません。`
      : `あなたが最高額です（現在 ¥${price.toLocaleString()}）。${res.extended ? '終了間際のため終了時刻が延長されました。' : ''}`;
  } else {
    info = `他の方の自動入札により上回られています（現在 ¥${price.toLocaleString()}）。上限を上げて再入札できます。`;
  }
  return { ok: true, info };
}

/** 即決購入する。SECURITY DEFINER 関数経由。 */
export async function buyNow(formData: FormData): Promise<{ ok: boolean; error?: string } | void> {
  const auctionId = String(formData.get('auction_id') || '');
  if (!auctionId) return { ok: false, error: '対象が不明です。' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  const { data, error } = await supabase.rpc('buy_now_part', { p_auction_id: auctionId });
  if (error) return { ok: false, error: '購入できませんでした。時間をおいて再度お試しください。' };
  const res = (data ?? {}) as { ok: boolean; error?: string; seller_id?: string; title?: string; amount?: number };
  if (!res.ok) {
    if (res.error === 'login') redirect(`/login?redirect=/parts/${auctionId}`);
    return { ok: false, error: res.error ?? '購入できませんでした。' };
  }

  const price = res.amount ?? 0;
  try {
    const title = res.title ?? '出品商品';
    if (res.seller_id) {
      await createNotification(res.seller_id, 'system', '即決で落札されました', `「${title}」が即決 ¥${price.toLocaleString()} で落札されました。`, `/parts/${auctionId}`);
    }
    await createNotification(user.id, 'system', '即決で落札しました', `「${title}」を ¥${price.toLocaleString()} で落札しました。出品者と取引を進めてください。`, `/parts/${auctionId}`);
  } catch { /* 通知失敗は無視 */ }

  revalidatePath(`/parts/${auctionId}`);
  return { ok: true };
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

/** 終了時刻を過ぎたオークションを確定する（reserve 反映・閲覧時の遅延クローズ）。 */
export async function closePartAuctionIfEnded(auctionId: string): Promise<void> {
  const svc = createServiceClient();
  const { data } = await svc.rpc('close_part_auction', { p_auction_id: auctionId });
  const r = (data ?? {}) as {
    ok?: boolean; noop?: boolean; sold?: boolean; winner_id?: string | null;
    seller_id?: string; title?: string; price?: number; reserve_missed?: boolean;
  };
  if (!r.ok || r.noop) return;

  const title = r.title ?? '出品商品';
  const price = r.price ?? 0;
  try {
    if (r.sold && r.winner_id) {
      await createNotification(r.winner_id, 'system', '落札しました', `「${title}」を ¥${price.toLocaleString()} で落札しました。`, `/parts/${auctionId}`);
      if (r.seller_id) await createNotification(r.seller_id, 'system', '落札されました', `「${title}」が ¥${price.toLocaleString()} で落札されました。`, `/parts/${auctionId}`);
    } else if (r.reserve_missed && r.seller_id) {
      await createNotification(r.seller_id, 'system', '最低落札価格に未達で終了', `「${title}」は最低落札価格に届かず、落札なしで終了しました。`, `/parts/${auctionId}`);
    }
  } catch { /* 通知失敗は無視 */ }
}

/** ウォッチ（お気に入り）のオン/オフを切り替える。 */
export async function toggleWatch(formData: FormData): Promise<{ ok: boolean; watching?: boolean; error?: string }> {
  const auctionId = String(formData.get('auction_id') || '');
  if (!auctionId) return { ok: false, error: '対象が不明です。' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  const { data: existing } = await supabase
    .from('part_watches')
    .select('auction_id')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('part_watches').delete().eq('auction_id', auctionId).eq('user_id', user.id);
    revalidatePath(`/parts/${auctionId}`);
    return { ok: true, watching: false };
  }
  const { error } = await supabase.from('part_watches').insert({ auction_id: auctionId, user_id: user.id });
  if (error) return { ok: false, error: 'ウォッチの登録に失敗しました。' };
  revalidatePath(`/parts/${auctionId}`);
  return { ok: true, watching: true };
}

/** 商品について出品者へ質問する。 */
export async function askQuestion(formData: FormData): Promise<{ ok: boolean; error?: string } | void> {
  const auctionId = String(formData.get('auction_id') || '');
  const body = String(formData.get('body') || '').trim();
  if (!auctionId || !body) return { ok: false, error: '質問内容を入力してください。' };
  if (body.length > 500) return { ok: false, error: '質問は500文字以内でお願いします。' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  const { error } = await supabase.from('part_questions').insert({ auction_id: auctionId, asker_id: user.id, body });
  if (error) return { ok: false, error: '質問の送信に失敗しました。' };

  // 出品者へ通知
  try {
    const svc = createServiceClient();
    const { data: a } = await svc.from('part_auctions').select('seller_id, title').eq('id', auctionId).maybeSingle();
    if (a?.seller_id) await createNotification(a.seller_id, 'system', '商品へ質問が届きました', `「${a.title}」に質問が届きました。`, `/parts/${auctionId}`);
  } catch { /* noop */ }

  revalidatePath(`/parts/${auctionId}`);
  return { ok: true };
}

/** 出品者が質問に回答する。 */
export async function answerQuestion(formData: FormData): Promise<{ ok: boolean; error?: string } | void> {
  const questionId = String(formData.get('question_id') || '');
  const auctionId = String(formData.get('auction_id') || '');
  const answer = String(formData.get('answer') || '').trim();
  if (!questionId || !answer) return { ok: false, error: '回答を入力してください。' };
  if (answer.length > 500) return { ok: false, error: '回答は500文字以内でお願いします。' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/parts/${auctionId}`);

  // RLS: 出品者本人のみ更新可
  const { data: updated, error } = await supabase
    .from('part_questions')
    .update({ answer, answered_at: new Date().toISOString() })
    .eq('id', questionId)
    .select('asker_id')
    .maybeSingle();
  if (error || !updated) return { ok: false, error: '回答の保存に失敗しました。' };

  try {
    if (updated.asker_id) await createNotification(updated.asker_id, 'system', '質問に回答がつきました', '出品者から回答がありました。', `/parts/${auctionId}`);
  } catch { /* noop */ }

  revalidatePath(`/parts/${auctionId}`);
  return { ok: true };
}
