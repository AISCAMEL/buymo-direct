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
  const transportRaw = String(formData.get('transport_fee') ?? '').trim();
  if (!id || !VALID.includes(status)) return;

  const patch: Record<string, unknown> = {
    status,
    reviewer_id: ctx.userId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  patch.rejection_reason = status === 'rejected' ? reason || null : null;

  const service = createServiceClient();

  // 承認・完了時は、遠方の陸送費を確定し「保証額 − 陸送費」を実支払額として記録する。
  if (status === 'approved' || status === 'completed') {
    const { data: req } = await service
      .from('buyback_requests')
      .select('buyback_price')
      .eq('id', id)
      .maybeSingle();
    const buybackPrice = Number((req as { buyback_price?: number } | null)?.buyback_price ?? 0);
    const transportFee = Math.max(0, Math.round(Number(transportRaw) || 0));
    patch.transport_fee = transportFee;
    patch.payout_amount = Math.max(0, buybackPrice - transportFee);
  }

  await service.from('buyback_requests').update(patch).eq('id', id);

  await logAdminAction(ctx, 'buyback_status', 'buyback_request', id, status);
  revalidatePath('/admin/buyback');
}
