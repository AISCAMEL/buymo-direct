'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { buybackPriceOf, EXTEND_DAYS } from '@/lib/buyback';

/** 加盟店オーナー/スタッフは買取保証の対象外。 */
async function assertIndividual(userId: string): Promise<boolean> {
  const dealer = await getDealerForUser(userId);
  return dealer === null;
}

export async function applyBuyback(listingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };
  if (!(await assertIndividual(user.id))) {
    return { error: '買取保証は個人会員さま向けのサービスです（加盟店の出品は対象外です）。' };
  }

  // 出品情報を取得
  const { data: listing, error: le } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .single();

  if (le || !listing) return { error: '出品が見つかりません' };
  if (listing.status !== 'active') return { error: 'この出品には買取保証を申請できません' };

  const aiMin = listing.ai_price_min ?? listing.price;
  const aiMax = listing.ai_price_max ?? listing.price;
  const buybackPrice = buybackPriceOf(aiMin, aiMax);

  // 重複チェック
  const { data: existing } = await supabase
    .from('buyback_requests')
    .select('id')
    .eq('listing_id', listingId)
    .in('status', ['pending', 'in_review', 'approved'])
    .maybeSingle();

  if (existing) return { error: 'この出品にはすでに買取保証申請中です' };

  const { error: insErr } = await supabase
    .from('buyback_requests')
    .insert({
      listing_id: listingId,
      seller_id: user.id,
      maker: listing.maker,
      model: listing.model,
      year: listing.year,
      mileage_km: listing.mileage_km,
      ai_price_min: aiMin,
      ai_price_max: aiMax,
      buyback_price: buybackPrice,
      from_pref: (listing as { prefecture?: string | null }).prefecture ?? null,
      status: 'pending',
    });

  if (insErr) return { error: insErr.message };

  revalidatePath('/dashboard/buyback');
  return { success: true, buybackPrice };
}

/** 買取保証を「買い取ってもらう」＝買取申請（フォーム用の void ラッパー）。 */
export async function redeemBuyback(listingId: string): Promise<void> {
  await applyBuyback(listingId);
  revalidatePath('/dashboard/buyback');
}

/** 保証期間を延長（本日から EXTEND_DAYS 日）。辞退状態も解除。 */
export async function extendGuarantee(listingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (!(await assertIndividual(user.id))) return;

  const until = new Date(Date.now() + EXTEND_DAYS * 86_400_000).toISOString();
  await supabase
    .from('listings')
    .update({ guarantee_until: until, guarantee_opt_out: false })
    .eq('id', listingId)
    .eq('seller_id', user.id);
  revalidatePath('/dashboard/buyback');
}

/** 買取保証を辞退（やめる）。 */
export async function optOutGuarantee(listingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('listings')
    .update({ guarantee_opt_out: true })
    .eq('id', listingId)
    .eq('seller_id', user.id);
  revalidatePath('/dashboard/buyback');
}

/** 辞退を取り消して保証を再開（本日から EXTEND_DAYS 日）。 */
export async function resumeGuarantee(listingId: string): Promise<void> {
  await extendGuarantee(listingId);
}
