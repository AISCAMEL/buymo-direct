'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** KYC 書類を提出（upsert）。Storage へのアップロードはクライアント側で行う。 */
export async function submitKyc(
  idFrontPath: string,
  selfiePath: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/kyc');

  const { error } = await supabase.from('kyc_documents').upsert(
    {
      user_id: user.id,
      id_front_url: idFrontPath,
      selfie_url: selfiePath,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      note: null,
    },
    { onConflict: 'user_id' }
  );
  if (error) return { error: error.message };

  await supabase
    .from('profiles')
    .update({ kyc_status: 'pending' })
    .eq('id', user.id);

  revalidatePath('/dashboard/kyc');
  return { error: null };
}
