'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function requestAppraisal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const year = parseInt(String(formData.get('year') ?? ''));
  const mileage_km = parseInt(String(formData.get('mileage_km') ?? ''));

  if (!formData.get('maker') || !formData.get('model') || !year || !mileage_km || !formData.get('prefecture')) {
    return;
  }

  await (supabase as any).from('appraisal_requests').insert({
    user_id: user.id,
    maker: String(formData.get('maker')).trim(),
    model: String(formData.get('model')).trim(),
    year,
    mileage_km,
    prefecture: String(formData.get('prefecture')),
    condition: String(formData.get('condition') ?? 'good'),
    notes: String(formData.get('notes') ?? '').trim() || null,
  });

  revalidatePath('/dashboard/appraisal');
}
