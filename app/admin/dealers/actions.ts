'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';

export async function approveDealer(dealerId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  await (supabase as any).from('dealers').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    rejection_note: null,
  }).eq('id', dealerId);
  revalidatePath('/admin/dealers');
}

export async function rejectDealer(dealerId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const note = String(formData.get('note') ?? '');
  const supabase = await createClient();
  await (supabase as any).from('dealers').update({
    status: 'pending',
    rejection_note: note || '申請内容を確認のうえ再申請してください。',
  }).eq('id', dealerId);
  revalidatePath('/admin/dealers');
}

export async function suspendDealer(dealerId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  await (supabase as any).from('dealers').update({ status: 'suspended' }).eq('id', dealerId);
  revalidatePath('/admin/dealers');
}

export async function reinstateDealer(dealerId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  await (supabase as any).from('dealers').update({ status: 'approved' }).eq('id', dealerId);
  revalidatePath('/admin/dealers');
}

export async function setCommissionRate(formData: FormData): Promise<void> {
  await requireAdmin();
  const dealerId = String(formData.get('dealer_id') ?? '');
  const rate = parseFloat(String(formData.get('rate') ?? ''));
  if (!dealerId || isNaN(rate) || rate < 0 || rate > 100) return;
  const supabase = await createClient();
  await (supabase as any).from('dealers').update({ commission_rate: rate }).eq('id', dealerId);
  revalidatePath('/admin/dealers');
}
