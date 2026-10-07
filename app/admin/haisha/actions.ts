'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import { sendHaishaStatusEmail } from '@/lib/email';

type HaishaStatus = 'pending' | 'assessing' | 'arranged' | 'picked_up' | 'paid' | 'erased' | 'refunded' | 'cancelled';
const VALID: HaishaStatus[] = ['pending', 'assessing', 'arranged', 'picked_up', 'paid', 'erased', 'refunded', 'cancelled'];
const STATUS_LABEL: Record<string, string> = {
  pending: '受付', assessing: '査定中', arranged: '成約・引取手配', picked_up: '引取完了',
  paid: '入金済', erased: '抹消完了', refunded: '還付完了', cancelled: 'キャンセル',
};
const FLAG_LABEL: Record<string, string> = { paid: '入金', erased: '抹消', refunded: '還付' };

type NotifyRow = { user_id: string | null; contact_email: string | null; maker: string | null; model: string | null; year: number | null };

/** 申込者へ進捗を通知（アプリ内通知＋メール、ベストエフォート）。 */
async function notifyApplicant(row: NotifyRow | null, title: string, body: string): Promise<void> {
  if (!row) return;
  const vehicle = `${row.maker ?? ''} ${row.model ?? ''}`.trim() || '廃車車両';
  if (row.user_id) {
    try {
      await createNotification(row.user_id, 'system', title, body, '/dashboard/haisha');
    } catch (err) {
      console.error('[haisha] 通知作成に失敗:', err instanceof Error ? err.message : err);
    }
  }
  if (row.contact_email) {
    try {
      await sendHaishaStatusEmail(row.contact_email, { statusLabel: body, vehicle });
    } catch (err) {
      console.error('[haisha] メール送信に失敗:', err instanceof Error ? err.message : err);
    }
  }
}

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

  const { data } = await service
    .from('haisha_requests')
    .select('user_id, contact_email, maker, model, year')
    .eq('id', id)
    .maybeSingle();
  await notifyApplicant(data as NotifyRow | null, '廃車買取の進捗が更新されました', STATUS_LABEL[status] ?? status);

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

  if (value) {
    const { data } = await service
      .from('haisha_requests')
      .select('user_id, contact_email, maker, model, year')
      .eq('id', id)
      .maybeSingle();
    await notifyApplicant(data as NotifyRow | null, '廃車買取の進捗が更新されました', `${FLAG_LABEL[field]}完了`);
  }

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
