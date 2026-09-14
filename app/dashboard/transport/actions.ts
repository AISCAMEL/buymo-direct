'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function bookTransport(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const from_prefecture = String(formData.get('from_prefecture') ?? '');
  const to_prefecture = String(formData.get('to_prefecture') ?? '');
  const preferred_date = String(formData.get('preferred_date') ?? '') || null;
  const vehicle_info = String(formData.get('vehicle_info') ?? '').trim() || null;

  if (!from_prefecture || !to_prefecture) return;

  await (supabase as any).from('transport_bookings').insert({
    user_id: user.id,
    from_prefecture,
    to_prefecture,
    preferred_date,
    vehicle_info,
    status: 'pending',
  });

  revalidatePath('/dashboard/transport');
}
