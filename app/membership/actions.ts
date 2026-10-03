'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** 有料会員に申し込む（本部承認制）。 */
export async function applyMembership(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/membership');

  // 既存の申込中があれば重複作成しない
  const { data: existing } = await supabase
    .from('membership_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle();
  if (!existing) {
    await supabase.from('membership_applications').insert({ user_id: user.id, plan: 'standard', status: 'pending' });
  }
  // 有料申込＝業者トラック（買取を事業として行う意思表示）
  await supabase.from('profiles').update({ account_type: 'business' }).eq('id', user.id);
  revalidatePath('/membership');
  redirect('/membership?applied=1');
}

/** 有料会員を解約（無料へ）。 */
export async function cancelMembership(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ member_tier: 'free' }).eq('id', user.id);
  await supabase.from('membership_applications').update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('user_id', user.id).in('status', ['pending', 'approved']);
  revalidatePath('/membership');
}
