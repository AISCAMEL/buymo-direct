'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { getPricingConfig } from '@/lib/settings';

type Charge = { id: string; dealer_id: string; fee_amount: number; tax: number; total: number };

/** 指定した締め日までの未請求手数料を、加盟店ごとに集約して締め請求を発行。 */
export async function closeAllBilling(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const periodEnd = String(formData.get('period_end') || '').slice(0, 10);
  if (!periodEnd) return;
  const endTs = new Date(periodEnd + 'T23:59:59').toISOString();

  const svc = createServiceClient();
  const cfg = await getPricingConfig();

  // 未請求のマッチング手数料・販売手数料（締め日まで）
  const [{ data: cc }, { data: sc }] = await Promise.all([
    svc.from('case_charges')
      .select('id, partner_id, fee_amount, tax, total, status, statement_id, created_at')
      .eq('status', 'pending').is('statement_id', null).lte('created_at', endTs),
    svc.from('sale_commissions')
      .select('id, dealer_id, fee_amount, tax, total, status, statement_id, created_at')
      .eq('status', 'pending').is('statement_id', null).lte('created_at', endTs),
  ]);

  const matching = ((cc ?? []) as any[]).map((r) => ({ id: r.id, dealer_id: r.partner_id, fee_amount: r.fee_amount, tax: r.tax, total: r.total })) as Charge[];
  const sales = ((sc ?? []) as any[]).map((r) => ({ id: r.id, dealer_id: r.dealer_id, fee_amount: r.fee_amount, tax: r.tax, total: r.total })) as Charge[];

  const dealerIds = Array.from(new Set([...matching, ...sales].map((c) => c.dealer_id).filter(Boolean)));
  if (dealerIds.length === 0) return;

  const due = new Date(periodEnd);
  due.setDate(due.getDate() + (cfg.billingDueDays || 14));
  const dueStr = due.toISOString().slice(0, 10);

  for (const dealerId of dealerIds) {
    const mine = matching.filter((c) => c.dealer_id === dealerId);
    const mineSales = sales.filter((c) => c.dealer_id === dealerId);
    if (mine.length === 0 && mineSales.length === 0) continue;

    const matchingTotal = mine.reduce((s, c) => s + (c.total ?? 0), 0);
    const salesTotal = mineSales.reduce((s, c) => s + (c.total ?? 0), 0);
    const subtotal = [...mine, ...mineSales].reduce((s, c) => s + (c.fee_amount ?? 0), 0);
    const tax = [...mine, ...mineSales].reduce((s, c) => s + (c.tax ?? 0), 0);
    const total = matchingTotal + salesTotal;

    const { data: st } = await svc.from('fee_statements').insert({
      dealer_id: dealerId,
      period_end: periodEnd,
      matching_total: matchingTotal,
      sales_total: salesTotal,
      subtotal, tax, total,
      status: 'issued',
      due_date: dueStr,
    }).select('id').single();
    if (!st) continue;

    if (mine.length) await svc.from('case_charges').update({ statement_id: st.id, status: 'invoiced', updated_at: new Date().toISOString() }).in('id', mine.map((c) => c.id));
    if (mineSales.length) await svc.from('sale_commissions').update({ statement_id: st.id, status: 'invoiced', updated_at: new Date().toISOString() }).in('id', mineSales.map((c) => c.id));
  }

  await logAdminAction(ctx, 'billing.close', 'fee_statement', periodEnd, `${dealerIds.length}件の加盟店を締め`);
  revalidatePath('/admin/statements');
  revalidatePath('/admin/billing');
  revalidatePath('/dealer/billing');
}

/** 締め請求のステータス変更（入金済で内訳手数料も入金済、キャンセルで内訳を差し戻し）。 */
export async function setStatementStatus(statementId: string, status: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const svc = createServiceClient();
  const now = new Date().toISOString();

  await svc.from('fee_statements').update({ status, updated_at: now }).eq('id', statementId);

  if (status === 'paid') {
    await svc.from('case_charges').update({ status: 'paid', updated_at: now }).eq('statement_id', statementId);
    await svc.from('sale_commissions').update({ status: 'paid', updated_at: now }).eq('statement_id', statementId);
  } else if (status === 'cancelled') {
    // 内訳を締めから外して未請求に戻す
    await svc.from('case_charges').update({ status: 'pending', statement_id: null, updated_at: now }).eq('statement_id', statementId);
    await svc.from('sale_commissions').update({ status: 'pending', statement_id: null, updated_at: now }).eq('statement_id', statementId);
  }

  await logAdminAction(ctx, `statement.status.${status}`, 'fee_statement', statementId);
  revalidatePath('/admin/statements');
  revalidatePath(`/admin/statements/${statementId}`);
  revalidatePath('/dealer/billing');
}
