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

  // ハニーポット（ボット対策）：人間には見えない項目が埋まっていたら無視（成功扱い）
  if (String(formData.get('website') || '').trim() || String(formData.get('website2') || '').trim()) return { ok: true };

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* 未ログインでも可 */ }

  try {
    const svc = createServiceClient();
    // 連投スパム抑止：同一メールで直近10分以内の申込があればスキップ（成功扱い）
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await svc
      .from('dealer_leads')
      .select('id')
      .eq('email', email)
      .gte('created_at', since)
      .maybeSingle();
    if (recent) return { ok: true };

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

    // ログイン済みユーザーが申し込んだら業者トラックへ（買取系を利用可能に）
    if (userId) await svc.from('profiles').update({ account_type: 'business' }).eq('id', userId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '送信に失敗しました' };
  }
  return { ok: true };
}
