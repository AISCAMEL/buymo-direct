'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function applyBuyback(listingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '認証が必要です' };

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
  const mid = (aiMin + aiMax) / 2;
  const buybackPrice = Math.round(mid * 0.75 / 10000) * 10000;

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
      status: 'pending',
    });

  if (insErr) return { error: insErr.message };

  revalidatePath('/dashboard/buyback');
  return { success: true, buybackPrice };
}
