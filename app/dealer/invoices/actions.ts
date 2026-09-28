'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireDealer } from '@/lib/dealer';
import { derivePaymentStatus, type InvoiceStatus } from '@/lib/invoices';

/** 見積からワンクリックで請求書を作成し、請求書へ遷移。 */
export async function createInvoiceFromQuote(quoteId: string): Promise<void> {
  const { supabase, dealer, user } = (await requireDealer()) as any;

  const { data: q } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('dealer_id', dealer.dealerId)
    .maybeSingle();
  if (!q) return;

  // 既に請求済みなら既存へ
  const { data: existing } = await supabase.from('invoices').select('id').eq('quote_id', quoteId).maybeSingle();
  if (existing) redirect(`/dealer/invoices/${existing.id}`);

  const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', quoteId).order('sort');
  const { data: biz } = await supabase
    .from('dealers')
    .select('bank_info, invoice_number')
    .eq('id', dealer.dealerId)
    .maybeSingle();

  const due = new Date();
  due.setDate(due.getDate() + 14);

  const { data: created, error } = await supabase
    .from('invoices')
    .insert({
      quote_id: q.id,
      dealer_id: dealer.dealerId,
      buyer_id: q.buyer_id,
      customer_name: q.customer_name,
      vehicle_summary: q.vehicle_summary,
      subtotal: q.subtotal,
      discount: q.discount,
      tax: q.tax,
      total: q.total,
      status: 'issued',
      due_date: due.toISOString().slice(0, 10),
      note: q.note,
      bank_info: (biz as { bank_info?: string } | null)?.bank_info ?? null,
      invoice_reg_no: (biz as { invoice_number?: string } | null)?.invoice_number ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !created) return;

  const rows = ((items ?? []) as any[]).map((it, i) => ({
    invoice_id: created.id, label: it.label, category: it.category, amount: it.amount, taxable: it.taxable, sort: i,
  }));
  if (rows.length) await supabase.from('invoice_items').insert(rows);

  await supabase.from('quotes').update({ status: 'converted', updated_at: new Date().toISOString() }).eq('id', quoteId);

  revalidatePath('/dealer/invoices');
  revalidatePath('/dealer/quotes');
  redirect(`/dealer/invoices/${created.id}`);
}

/** 請求ステータスを変更。 */
export async function updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
  const { supabase } = (await requireDealer()) as any;
  await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', invoiceId);
  revalidatePath(`/dealer/invoices/${invoiceId}`);
  revalidatePath('/dealer/invoices');
}

/** 入金を記録し、入金合計・ステータスを再計算。 */
export async function recordPayment(invoiceId: string, formData: FormData): Promise<void> {
  const { supabase, dealer, user } = (await requireDealer()) as any;
  const amount = Math.max(0, Math.round(Number(formData.get('amount')) || 0));
  if (amount <= 0) return;
  const method = String(formData.get('method') || 'bank');
  const note = String(formData.get('note') || '').trim() || null;

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, total, paid_amount, status')
    .eq('id', invoiceId)
    .eq('dealer_id', dealer.dealerId)
    .maybeSingle();
  if (!inv) return;

  await supabase.from('invoice_payments').insert({
    invoice_id: invoiceId, amount, method, note, recorded_by: user.id,
  });

  const newPaid = (inv.paid_amount ?? 0) + amount;
  const newStatus = derivePaymentStatus(inv.total ?? 0, newPaid, inv.status as InvoiceStatus);
  await supabase
    .from('invoices')
    .update({ paid_amount: newPaid, status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);

  revalidatePath(`/dealer/invoices/${invoiceId}`);
  revalidatePath('/dealer/invoices');
}
