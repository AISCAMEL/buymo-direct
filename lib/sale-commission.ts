import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import { getPricingConfig } from '@/lib/settings';

/** 一般ユーザーの出品と区別する既定の業販レート（%）。加盟店個別が優先。 */
export const DEFAULT_DEALER_COMMISSION_RATE = 3;

/**
 * 加盟店の自社在庫が売れたら成果報酬（販売手数料）を記録する。
 * - listing.dealer_id が無い（一般ユーザーの出品）場合は何もしない。
 * - 料率は加盟店の commission_rate（業販レート）。税は本部設定の税率。
 * - escrow_id 単位で upsert（冪等）。取引完了フローを妨げないよう例外は握りつぶす。
 */
export async function recordDealerSaleCommission(escrowId: string): Promise<void> {
  try {
    const svc = createServiceClient();

    const { data: tx } = await svc
      .from('escrow_transactions')
      .select('id, amount, listing_id, status')
      .eq('id', escrowId)
      .maybeSingle();
    if (!tx || tx.status !== 'completed' || !tx.listing_id) return;

    const { data: listing } = await svc
      .from('listings')
      .select('dealer_id, title')
      .eq('id', tx.listing_id)
      .maybeSingle();
    const dealerId = (listing as { dealer_id?: string | null } | null)?.dealer_id;
    if (!dealerId) return; // 一般ユーザーの出品は対象外

    const { data: dealer } = await svc
      .from('dealers')
      .select('commission_rate')
      .eq('id', dealerId)
      .maybeSingle();
    const ratePct = Number((dealer as { commission_rate?: number } | null)?.commission_rate ?? DEFAULT_DEALER_COMMISSION_RATE);

    const sale = Math.max(0, Math.round((tx.amount as number) ?? 0));
    const fee = Math.round((sale * ratePct) / 100);
    const cfg = await getPricingConfig();
    const tax = Math.round(fee * (cfg.matchingFeeTaxRate ?? 0.1));

    await svc.from('sale_commissions').upsert(
      {
        escrow_id: tx.id,
        listing_id: tx.listing_id,
        dealer_id: dealerId,
        title: (listing as { title?: string } | null)?.title ?? null,
        sale_amount: sale,
        rate: ratePct,
        fee_amount: fee,
        tax,
        total: fee + tax,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'escrow_id' }
    );
  } catch {
    /* 記録失敗は取引完了を妨げない（本部で後追い可能） */
  }
}
