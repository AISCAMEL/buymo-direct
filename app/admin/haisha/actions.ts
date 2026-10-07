'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

type HaishaStatus = 'pending' | 'assessing' | 'arranged' | 'picked_up' | 'paid' | 'erased' | 'refunded' | 'cancelled';
const VALID: HaishaStatus[] = ['pending', 'assessing', 'arranged', 'picked_up', 'paid', 'erased', 'refunded', 'cancelled'];

/** 廃車買取申込のステータスを更新。 */
export async function updateHaishaStatus(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as HaishaStatus;
  if (!id || !VALID.includes(status)) return;

  const service = createServiceClient();
  await service.from('haisha_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  await logAdminAction(ctx, 'haisha_status', 'haisha_request', id, status);
  revalidatePath('/admin/haisha');
}

/** 入金・抹消・還付の進捗フラグを更新。 */
export async function toggleHaishaFlag(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const id = String(formData.get('id') ?? '');
  const field = String(formData.get('field') ?? '');
  const value = String(formData.get('value') ?? '') === 'true';
  if (!id || !['paid', 'erased', 'refunded'].includes(field)) return;

  const service = createServiceClient();
  await service.from('haisha_requests').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
  await logAdminAction(ctx, 'haisha_flag', 'haisha_request', id, `${field}=${value}`);
  revalidatePath('/admin/haisha');
}

/** 運営メモを保存。 */
export async function saveHaishaMemo(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const id = String(formData.get('id') ?? '');
  const memo = String(formData.get('admin_memo') ?? '').slice(0, 2000);
  if (!id) return;

  const service = createServiceClient();
  await service.from('haisha_requests').update({ admin_memo: memo || null, updated_at: new Date().toISOString() }).eq('id', id);
  await logAdminAction(ctx, 'haisha_memo', 'haisha_request', id, '');
  revalidatePath('/admin/haisha');
}
