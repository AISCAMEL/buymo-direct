'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

type BuybackStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
const VALID: BuybackStatus[] = ['pending', 'in_review', 'approved', 'rejected', 'completed'];

/** 買取保証申請のステータスを更新（不承認時は理由を保存）。 */
export async function updateBuybackStatus(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as BuybackStatus;
  const reason = String(formData.get('rejection_reason') ?? '').trim();
  if (!id || !VALID.includes(status)) return;

  const patch: Record<string, unknown> = {
    status,
    reviewer_id: ctx.userId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  patch.rejection_reason = status === 'rejected' ? reason || null : null;

  const service = createServiceClient();
  await service.from('buyback_requests').update(patch).eq('id', id);

  await logAdminAction(ctx, 'buyback_status', 'buyback_request', id, status);
  revalidatePath('/admin/buyback');
}
