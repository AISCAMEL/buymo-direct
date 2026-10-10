'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getPricingConfig } from '@/lib/settings';
import { computeFranchiseFee, type FranchisePaymentMethod } from '@/lib/franchise';

/** 買取加盟の申込。加盟金を支払い方法に応じて算出して記録。 */
export async function submitFranchise(formData: FormData): Promise<{ ok: boolean; error?: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/franchise');

  const method: FranchisePaymentMethod = String(formData.get('payment_method')) === 'card' ? 'card' : 'invoice';
  const contactName = String(formData.get('contact_name') || '').trim();
  if (!contactName) return { ok: false, error: 'ご担当者名をご入力ください。' };

  // 申込中が既にあれば二重作成しない
  const { data: existing } = await supabase
    .from('franchise_applications')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'invoiced', 'paid'])
    .maybeSingle();
  if (existing) redirect('/franchise?applied=1');

  const cfg = await getPricingConfig();
  const fee = computeFranchiseFee(cfg.joiningFee, cfg.squareSurchargeRate, method);

  const { error } = await supabase.from('franchise_applications').insert({
    user_id: user.id,
    company_name: String(formData.get('company_name') || '').trim() || null,
    contact_name: contactName,
    phone: String(formData.get('phone') || '').trim() || null,
    prefecture: String(formData.get('prefecture') || '').trim() || null,
    payment_method: method,
    joining_fee: fee.joiningFee,
    surcharge: fee.surcharge,
    total: fee.total,
    note: String(formData.get('note') || '').trim() || null,
    status: 'pending',
  });
  if (error) return { ok: false, error: error.message };

  // 業者トラック（買取加盟）として明示
  await supabase.from('profiles').update({ account_type: 'business', business_kind: 'buyback' }).eq('id', user.id);

  // 買取加盟に至ったので、この申込者宛の買取オファー・ローンチは停止する（user_id またはメール一致）。
  try {
    const svc = createServiceClient();
    const filters = [`user_id.eq.${user.id}`];
    if (user.email) filters.push(`email.eq.${user.email}`);
    await svc
      .from('dealer_leads')
      .update({ campaign_status: 'converted', updated_at: new Date().toISOString() })
      .or(filters.join(','))
      .in('campaign_status', ['active', 'stopped']);
  } catch {
    /* ベストエフォート：失敗しても申込は成立 */
  }

  revalidatePath('/franchise');
  redirect('/franchise?applied=1');
}

/** 申込のキャンセル（本人）。 */
export async function cancelFranchise(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('franchise_applications')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id).in('status', ['pending', 'invoiced']);
  revalidatePath('/franchise');
}
