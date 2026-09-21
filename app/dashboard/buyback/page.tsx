import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BuybackClient, type EligibleListing, type BuybackRow } from './BuybackClient';

export const dynamic = 'force-dynamic';

const ELIGIBLE_DAYS = 30;

function buybackPriceOf(aiMin: number, aiMax: number): number {
  const mid = (aiMin + aiMax) / 2;
  return Math.round((mid * 0.75) / 10000) * 10000;
}

export default async function BuybackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/buyback');

  // 自分の出品と、既存の買取保証申請を取得
  const [{ data: listings }, { data: reqRows }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, maker, model, year, mileage_km, price, ai_price_min, ai_price_max, status, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('buyback_requests')
      .select('id, listing_id, maker, model, year, buyback_price, status, rejection_reason, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const requests: BuybackRow[] = (reqRows ?? []).map((r) => ({
    id: r.id,
    maker: r.maker,
    model: r.model,
    year: r.year,
    buyback_price: r.buyback_price,
    status: r.status,
    rejection_reason: r.rejection_reason ?? null,
    created_at: r.created_at,
  }));

  // すでに申請中/承認済み/完了の listing_id は対象外
  const lockedListingIds = new Set(
    (reqRows ?? [])
      .filter((r) => ['pending', 'in_review', 'approved', 'completed'].includes(r.status))
      .map((r) => r.listing_id),
  );

  const now = Date.now();
  const eligible: EligibleListing[] = (listings ?? [])
    .filter((l) => l.status === 'active' && !lockedListingIds.has(l.id))
    .map((l) => {
      const daysSince = Math.floor((now - new Date(l.created_at).getTime()) / 86_400_000);
      const aiMin = l.ai_price_min ?? l.price;
      const aiMax = l.ai_price_max ?? l.price;
      return {
        id: l.id,
        maker: l.maker,
        model: l.model,
        year: l.year,
        mileage_km: l.mileage_km,
        price: l.price,
        ai_price_min: aiMin,
        ai_price_max: aiMax,
        buyback_price: buybackPriceOf(aiMin, aiMax),
        days_since: daysSince,
      };
    })
    .filter((l) => l.days_since >= ELIGIBLE_DAYS);

  return <BuybackClient eligible={eligible} requests={requests} />;
}
