'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

type Svc = ReturnType<typeof createServiceClient>;

export type SeededResult = {
  error: string | null;
  buyer?: { email: string; password: string };
  seller?: { email: string; password: string };
  listingId?: string;
  conversationId?: string;
};

function randPassword(): string {
  return 'Test-' + Math.random().toString(36).slice(2, 10) + 'A9!';
}

async function requireAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = createServiceClient();
  const { data: prof } = await svc.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return (prof as { role?: string } | null)?.role === 'admin' ? user.id : null;
}

/** テスト用ユーザーを作成（既存なら PW を再設定）。profile も用意。 */
async function ensureUser(
  svc: Svc,
  email: string,
  password: string,
  displayName: string,
): Promise<string | null> {
  const created = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  let userId = created.data?.user?.id ?? null;
  if (!userId) {
    // 既存ユーザー：一覧から探して PW を再設定
    const list = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = list.data?.users?.find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase());
    if (!u) return null;
    userId = u.id;
    await svc.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }
  await svc.from('profiles').upsert(
    { id: userId, display_name: displayName, role: 'user', member_tier: 'free' },
    { onConflict: 'id' },
  );
  return userId;
}

/** 購入フロー検証用のテストシナリオ（買主・売主・出品・会話）を実データで作成。 */
export async function seedTestPurchase(input: {
  buyerEmail: string;
  sellerEmail: string;
  price: number;
}): Promise<SeededResult> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: '管理者のみ実行できます' };

  const buyerEmail = (input.buyerEmail || '').trim().toLowerCase();
  const sellerEmail = (input.sellerEmail || '').trim().toLowerCase();
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!re.test(buyerEmail) || !re.test(sellerEmail)) return { error: 'メールアドレスの形式が正しくありません' };
  if (buyerEmail === sellerEmail) return { error: '買主・売主は別のメールにしてください' };
  const price = Math.max(10000, Math.min(99999999, Math.round(input.price || 300000)));

  const svc = createServiceClient();
  const buyerPw = randPassword();
  const sellerPw = randPassword();

  const buyerId = await ensureUser(svc, buyerEmail, buyerPw, 'テスト買主');
  const sellerId = await ensureUser(svc, sellerEmail, sellerPw, 'テスト売主');
  if (!buyerId || !sellerId) return { error: 'テストアカウントの作成に失敗しました（メール重複などをご確認ください）' };

  const { data: listing, error: le } = await svc
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: `【テスト】トヨタ アクア S`,
      maker: 'トヨタ', model: 'アクア', year: 2020, mileage_km: 40000, price,
      body_type: 'ハッチバック', transmission: 'CVT', fuel: 'ハイブリッド',
      color: 'ホワイト', prefecture: '東京都', repair_history: false,
      description: 'これは購入フロー検証用のテスト出品です。終わったら削除してください。',
      status: 'active', listing_type: 'direct',
    })
    .select('id')
    .single();
  if (le || !listing) return { error: `テスト出品の作成に失敗：${le?.message ?? ''}` };

  const { data: conv, error: ce } = await svc
    .from('conversations')
    .insert({ listing_id: listing.id, buyer_id: buyerId, seller_id: sellerId })
    .select('id')
    .single();
  if (ce || !conv) return { error: `会話の作成に失敗：${ce?.message ?? ''}` };

  await svc.from('messages').insert({
    conversation_id: conv.id,
    sender_id: buyerId,
    body: '（テスト）購入を検討しています。よろしくお願いします。',
  });

  return {
    error: null,
    buyer: { email: buyerEmail, password: buyerPw },
    seller: { email: sellerEmail, password: sellerPw },
    listingId: listing.id as string,
    conversationId: conv.id as string,
  };
}

/** テスト出品に紐づくデータ（イベント・取引・会話・メッセージ・出品）を削除。 */
export async function cleanupTestListing(listingId: string): Promise<{ error: string | null }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: '管理者のみ実行できます' };
  if (!listingId) return { error: '出品IDが指定されていません' };

  const svc = createServiceClient();
  try {
    const { data: escrows } = await svc.from('escrow_transactions').select('id').eq('listing_id', listingId);
    const escrowIds = (escrows ?? []).map((e: { id: string }) => e.id);
    if (escrowIds.length) {
      await svc.from('escrow_events').delete().in('escrow_id', escrowIds);
      await svc.from('reviews').delete().in('escrow_id', escrowIds);
      await svc.from('escrow_transactions').delete().in('id', escrowIds);
    }
    const { data: convs } = await svc.from('conversations').select('id').eq('listing_id', listingId);
    const convIds = (convs ?? []).map((c: { id: string }) => c.id);
    if (convIds.length) {
      await svc.from('messages').delete().in('conversation_id', convIds);
      await svc.from('conversations').delete().in('id', convIds);
    }
    await svc.from('listing_images').delete().eq('listing_id', listingId);
    await svc.from('listings').delete().eq('id', listingId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '削除に失敗しました' };
  }
}
