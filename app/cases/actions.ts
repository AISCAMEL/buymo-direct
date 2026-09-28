'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { skillLabel } from '@/lib/cases';
import { getPricingConfig } from '@/lib/settings';
import { computeMatchingFee } from '@/lib/matching-fee';

/** ユーザーが加盟店（車のプロ）に直接依頼して案件(Case)を作成。 */
export async function requestPartner(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const dealerId = String(formData.get('dealer_id') ?? '');
  const type = String(formData.get('type') ?? 'other');
  const detail = String(formData.get('detail') ?? '').trim();

  if (!user) redirect(`/login?redirect=/dealers/${dealerId}`);
  if (!dealerId) return;

  // 加盟店の存在確認（承認済みのみ）
  const { data: dealer } = await supabase.from('dealers').select('id, name, status').eq('id', dealerId).maybeSingle();
  if (!dealer || (dealer as { status?: string }).status !== 'approved') return;

  await supabase.from('cases').insert({
    type,
    source: 'PARTNER',
    status: 'new',
    user_id: user.id,
    partner_id: dealerId,
    title: `${skillLabel(type)}のご依頼`,
    detail: detail || null,
  });

  revalidatePath('/dashboard/cases');
  redirect('/dashboard/cases?created=1');
}

/** 加盟店オーナーが自社宛案件の状態を更新（受注/辞退/対応/完了）。 */
export async function partnerSetCaseStatus(caseId: string, status: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // RLS（cases_partner_update）で自社宛のみ許可される
  await supabase.from('cases').update({ status, updated_at: new Date().toISOString() }).eq('id', caseId);
  revalidatePath('/dealer/cases');
}

/**
 * 加盟店が案件を「完了」にし、成約金額からマッチング手数料を確定・請求作成。
 * 手数料は加盟店→本部の成果報酬。請求レコードは service role で作成する。
 */
export async function partnerCompleteCase(caseId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const amount = Math.max(0, Math.round(Number(formData.get('amount') ?? 0)));

  // 自社宛の案件のみ取得可（RLS: cases_partner_read）
  const { data: c } = await supabase
    .from('cases')
    .select('id, type, partner_id, user_id, status')
    .eq('id', caseId)
    .maybeSingle();
  const kase = c as { id: string; type: string; partner_id: string | null; user_id: string; status: string } | null;
  if (!kase) return;
  // 完了できるのは対応中/確認待ちのみ
  if (!['in_progress', 'awaiting', 'accepted'].includes(kase.status)) return;

  // 成約金額を記録し完了へ（RLS: cases_partner_update）
  await supabase
    .from('cases')
    .update({ status: 'completed', amount, updated_at: new Date().toISOString() })
    .eq('id', caseId);

  // 手数料を算出し請求レコードを作成（service role）
  try {
    const cfg = await getPricingConfig();
    const fee = computeMatchingFee(kase.type, amount, cfg);
    const svc = createServiceClient();
    const now = new Date().toISOString();
    await svc.from('case_charges').upsert(
      {
        case_id: kase.id,
        partner_id: kase.partner_id,
        user_id: kase.user_id,
        category: fee.category,
        base_amount: fee.base,
        fee_rate: fee.rate,
        fee_amount: fee.feeExclTax,
        tax: fee.tax,
        total: fee.total,
        status: 'pending',
        updated_at: now,
      },
      { onConflict: 'case_id' }
    );
  } catch { /* 請求作成の失敗は完了操作を妨げない（本部で後追い可能） */ }

  revalidatePath('/dealer/cases');
  revalidatePath('/dealer/billing');
  revalidatePath('/dashboard/cases');
}

/** 依頼者が案件をキャンセル（終了）。 */
export async function cancelCase(caseId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('cases').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', caseId).eq('user_id', user.id);
  revalidatePath('/dashboard/cases');
}
