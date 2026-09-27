'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** 自社の加盟店IDを取得（オーナーのみ）。 */
async function myDealerId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, dealerId: null as string | null };
  const { data } = await supabase.from('dealers').select('id').eq('owner_id', user.id).maybeSingle();
  return { supabase, dealerId: (data as { id: string } | null)?.id ?? null };
}

/** 提供スキルを追加/更新（RLSで自社のみ許可）。 */
export async function addPartnerSkill(formData: FormData): Promise<void> {
  const { supabase, dealerId } = await myDealerId();
  if (!dealerId) return;
  const skill_key = String(formData.get('skill_key') ?? '');
  const priceRaw = String(formData.get('price_from') ?? '').trim();
  const area = String(formData.get('area') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!skill_key) return;
  const price_from = priceRaw ? Math.max(0, Number(priceRaw)) : null;

  await supabase.from('partner_skills').upsert(
    { dealer_id: dealerId, skill_key, price_from, area, note, active: true },
    { onConflict: 'dealer_id,skill_key' }
  );
  revalidatePath('/dealer/skills');
}

/** 提供スキルを削除。 */
export async function removePartnerSkill(id: string): Promise<void> {
  const { supabase, dealerId } = await myDealerId();
  if (!dealerId) return;
  await supabase.from('partner_skills').delete().eq('id', id).eq('dealer_id', dealerId);
  revalidatePath('/dealer/skills');
}
