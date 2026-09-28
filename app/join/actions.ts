'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/** 加盟店・プロ希望フォームの送信（未ログインでも可・service roleで保存）。 */
export async function submitLead(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim() || null;
  const wish = String(formData.get('business_type_wish') || 'undecided');
  const message = String(formData.get('message') || '').trim() || null;
  const source = String(formData.get('source') || 'join') || 'join';

  if (!name || !email) return { ok: false, error: 'お名前とメールアドレスをご入力ください。' };

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* 未ログインでも可 */ }

  try {
    const svc = createServiceClient();
    const { error } = await svc.from('dealer_leads').insert({
      user_id: userId,
      name,
      email,
      phone,
      business_type_wish: wish,
      message,
      source,
      status: 'new',
    });
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '送信に失敗しました' };
  }
  return { ok: true };
}
