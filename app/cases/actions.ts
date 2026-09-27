'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { skillLabel } from '@/lib/cases';

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

/** 依頼者が案件をキャンセル（終了）。 */
export async function cancelCase(caseId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('cases').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', caseId).eq('user_id', user.id);
  revalidatePath('/dashboard/cases');
}
