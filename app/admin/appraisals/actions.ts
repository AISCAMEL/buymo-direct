'use server';

import { revalidatePath } from 'next/cache';
import { isAdminUser } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendAppraisalResultEmail } from '@/lib/email';

/** 正式査定に確定金額を入力し、ステータスを更新（完了時は結果メール送信）。 */
export async function updateAppraisalQuote(formData: FormData): Promise<void> {
  if (!(await isAdminUser())) return;

  const id = String(formData.get('id') ?? '');
  const low = Number(formData.get('price_low'));
  const high = Number(formData.get('price_high'));
  const status = String(formData.get('status') ?? 'completed');
  if (!id) return;

  const patch: Record<string, unknown> = { status };
  if (Number.isFinite(low) && low > 0) patch.price_low = Math.round(low);
  if (Number.isFinite(high) && high > 0) patch.price_high = Math.round(high);
  if (status === 'completed') patch.completed_at = new Date().toISOString();

  const service = createServiceClient();
  const { data } = await service
    .from('appraisal_requests')
    .update(patch)
    .eq('id', id)
    .select('maker, model, year, contact_email')
    .maybeSingle();

  // 完了かつメールがあれば結果を送信
  const row = data as { maker: string; model: string; year: number; contact_email: string | null } | null;
  if (status === 'completed' && row?.contact_email && Number.isFinite(low) && Number.isFinite(high)) {
    try {
      await sendAppraisalResultEmail(row.contact_email, {
        maker: row.maker,
        model: row.model,
        year: row.year,
        priceLow: Math.round(low),
        priceHigh: Math.round(high),
      });
    } catch {
      /* メール失敗は無視 */
    }
  }

  revalidatePath('/admin/appraisals');
}
