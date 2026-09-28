'use server';

import { revalidatePath } from 'next/cache';
import { requireDealer } from '@/lib/dealer';
import { getPricingConfig } from '@/lib/settings';
import { computeQuoteTotals, type QuoteItemInput } from '@/lib/quotes';

export type CreateQuoteInput = {
  listingId?: string | null;
  buyerId?: string | null;
  customerName?: string | null;
  vehicleSummary?: string | null;
  validUntil?: string | null;   // YYYY-MM-DD
  note?: string | null;
  discount?: number;
  items: QuoteItemInput[];
};

/** 見積を作成（明細つき）。合計はサーバーで再計算して保存。 */
export async function createQuote(input: CreateQuoteInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { dealer, supabase, user } = (await requireDealer()) as any;

  const items = (input.items || [])
    .map((it) => ({
      label: String(it.label || '').trim(),
      category: String(it.category || 'other'),
      amount: Math.round(Number(it.amount) || 0),
      taxable: it.taxable !== false,
    }))
    .filter((it) => it.label && it.amount !== 0);
  if (items.length === 0) return { ok: false, error: '明細を1件以上入力してください。' };

  const cfg = await getPricingConfig();
  const discount = Math.max(0, Math.round(Number(input.discount) || 0));
  const { subtotal, tax, total } = computeQuoteTotals(items, discount, cfg.consumptionTaxRate ?? 0.1);

  const { data: created, error } = await supabase
    .from('quotes')
    .insert({
      dealer_id: dealer.dealerId,
      listing_id: input.listingId || null,
      buyer_id: input.buyerId || null,
      customer_name: input.customerName?.trim() || null,
      vehicle_summary: input.vehicleSummary?.trim() || null,
      subtotal,
      discount,
      tax,
      total,
      status: 'draft',
      valid_until: input.validUntil || null,
      note: input.note?.trim() || null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !created) return { ok: false, error: error?.message || '見積の作成に失敗しました。' };

  const rows = items.map((it, i) => ({ quote_id: created.id, ...it, sort: i }));
  const { error: itemErr } = await supabase.from('quote_items').insert(rows);
  if (itemErr) return { ok: false, error: itemErr.message };

  revalidatePath('/dealer/quotes');
  return { ok: true, id: created.id };
}

/** 見積のステータスを変更。 */
export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  const { supabase } = (await requireDealer()) as any;
  await supabase.from('quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', quoteId);
  revalidatePath('/dealer/quotes');
  revalidatePath(`/dealer/quotes/${quoteId}`);
}
