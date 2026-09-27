'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

// クーポン管理は管理者のみ（requireAdmin）。RLSに管理用ポリシーが無いため
// service role で操作する（認可は requireAdmin で担保）。

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = createServiceClient();

  const code = String(formData.get('code')).toUpperCase().trim();
  const type = String(formData.get('type')) as 'percent' | 'fixed';
  const value = Number(formData.get('value'));
  const min_amount = Number(formData.get('min_amount') || 0);
  const max_uses = formData.get('max_uses') ? Number(formData.get('max_uses')) : null;
  const expires_at = formData.get('expires_at') ? new Date(String(formData.get('expires_at'))).toISOString() : null;

  if (!code || !value) return;
  if (type === 'percent' && (value < 1 || value > 99)) return;

  await supabase.from('coupons').insert({ code, type, value, min_amount, max_uses, expires_at, active: true });
  revalidatePath('/admin/coupons');
}

export async function toggleCoupon(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  const supabase = createServiceClient();
  await supabase.from('coupons').update({ active }).eq('id', id);
  revalidatePath('/admin/coupons');
}

export async function deleteCoupon(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createServiceClient();
  await supabase.from('coupons').delete().eq('id', id);
  revalidatePath('/admin/coupons');
}
