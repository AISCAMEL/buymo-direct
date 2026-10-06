'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** 通知・メール設定を保存。 */
export async function saveNotificationPrefs(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/settings');

  const on = (k: string) => formData.get(k) === 'on';
  await supabase
    .from('profiles')
    .update({
      notify_price_drop: on('notify_price_drop'),
      notify_saved_search: on('notify_saved_search'),
      notify_message: on('notify_message'),
      accept_newsletter: on('accept_newsletter'),
    })
    .eq('id', user.id);

  revalidatePath('/dashboard/settings');
  redirect('/dashboard/settings?saved=1');
}
