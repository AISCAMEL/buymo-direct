'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireDealer } from '@/lib/dealer';
import { createServiceClient } from '@/lib/supabase/service';
import { getPricingConfig } from '@/lib/settings';
import { computeSettlement } from '@/lib/auction';

function toInt(v: FormDataEntryValue | null): number {
  const n = Math.round(Number(String(v ?? '').replace(/[^0-9.-]/g, '')));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** オークションに出品（出品料が発生）。 */
export async function createAuctionListing(formData: FormData): Promise<void> {
  const { dealer, user } = await requireDealer();
  const carName = String(formData.get('car_name') || '').trim();
  if (!carName) return;

  const cfg = await getPricingConfig();
  const svc = createServiceClient();
  const { data: created } = await svc.from('auction_listings').insert({
    dealer_id: dealer.dealerId,
    user_id: user.id,
    car_name: carName,
    maker: String(formData.get('maker') || '').trim() || null,
    model_year: toInt(formData.get('model_year')) || null,
    mileage: toInt(formData.get('mileage')) || null,
    reserve_price: toInt(formData.get('reserve_price')) || null,
    listing_fee: cfg.auctionListingFee,
    status: 'listed',
  }).select('id').single();

  const id = (created as { id?: string } | null)?.id;
  revalidatePath('/dealer/auctions');
  if (id) redirect(`/dealer/auctions/${id}`);
  redirect('/dealer/auctions');
}

/** 出品ステータスを変更（落札/不落/取消）。 */
export async function setAuctionStatus(listingId: string, status: string): Promise<void> {
  const { dealer } = await requireDealer();
  const svc = createServiceClient();
  const { data: row } = await svc.from('auction_listings').select('dealer_id').eq('id', listingId).maybeSingle();
  if ((row as { dealer_id?: string } | null)?.dealer_id !== dealer.dealerId) return;
  await svc.from('auction_listings').update({ status, updated_at: new Date().toISOString() }).eq('id', listingId);
  revalidatePath(`/dealer/auctions/${listingId}`);
  revalidatePath('/dealer/auctions');
}

/** 決算書を保存（利益・成約手数料を算出）。 */
export async function saveSettlement(listingId: string, formData: FormData): Promise<void> {
  const { dealer } = await requireDealer();
  const svc = createServiceClient();

  const { data: listing } = await svc
    .from('auction_listings')
    .select('id, dealer_id, listing_fee')
    .eq('id', listingId)
    .maybeSingle();
  const l = listing as { id?: string; dealer_id?: string; listing_fee?: number } | null;
  if (!l || l.dealer_id !== dealer.dealerId) return;

  const cfg = await getPricingConfig();
  const salePrice = toInt(formData.get('sale_price'));
  const purchaseCost = toInt(formData.get('purchase_cost'));
  const expenses = toInt(formData.get('expenses'));
  const listingFee = Math.max(0, Math.round(l.listing_fee ?? cfg.auctionListingFee));
  const rate = cfg.dealCommissionRate;
  const { profit, commission, totalDue } = computeSettlement({ salePrice, purchaseCost, expenses, listingFee, rate });

  await svc.from('auction_settlements').upsert(
    {
      listing_id: listingId,
      dealer_id: dealer.dealerId,
      sale_price: salePrice,
      purchase_cost: purchaseCost,
      expenses,
      listing_fee: listingFee,
      profit,
      commission_rate: rate,
      commission,
      total_due: totalDue,
      status: 'finalized',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id' }
  );
  await svc.from('auction_listings').update({ status: 'settled', updated_at: new Date().toISOString() }).eq('id', listingId);

  revalidatePath(`/dealer/auctions/${listingId}`);
  revalidatePath('/dealer/auctions');
  redirect(`/dealer/auctions/${listingId}`);
}
