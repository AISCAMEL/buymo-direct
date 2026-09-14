'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const PLANS = {
  basic: { months: 3, price: 29800 },
  standard: { months: 6, price: 49800 },
  premium: { months: 12, price: 89800 },
};

export async function subscribeWarranty(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const plan = String(formData.get('plan') ?? '') as keyof typeof PLANS;
  if (!PLANS[plan]) return;

  const { months, price } = PLANS[plan];
  const starts = new Date();
  const ends = new Date(starts);
  ends.setMonth(ends.getMonth() + months);

  await (supabase as any).from('warranty_subscriptions').insert({
    user_id: user.id,
    plan,
    months,
    price,
    starts_at: starts.toISOString().slice(0, 10),
    ends_at: ends.toISOString().slice(0, 10),
    status: 'active',
  });

  revalidatePath('/dashboard/warranty');
}
