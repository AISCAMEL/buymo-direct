'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendContactEmails } from '@/lib/email';

const CATEGORY_LABELS: Record<string, string> = {
  general: '一般的なお問い合わせ',
  buyback: '買取・無料査定について',
  listing: 'ダイレクト販売・出品について',
  payment: '決済・エスクローについて',
  account: 'アカウント・ログインについて',
  dealer: '加盟店申請について',
  other: 'その他',
};

export type ContactResult = { ok: boolean; error?: string };

export async function submitContact(input: {
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<ContactResult> {
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim();
  const category = CATEGORY_LABELS[input.category] ? input.category : 'general';
  const message = (input.message ?? '').trim();

  // 入力検証
  if (!name || name.length > 100) return { ok: false, error: 'お名前をご確認ください。' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return { ok: false, error: 'メールアドレスをご確認ください。' };
  if (!message || message.length > 5000)
    return { ok: false, error: 'お問い合わせ内容をご確認ください。' };

  // ログインユーザーなら user_id を紐付け（任意）
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* 未ログインでも可 */
  }

  // DB保存（service role・ベストエフォート）
  try {
    const service = createServiceClient();
    await service.from('contact_messages').insert({
      name,
      email,
      category,
      message,
      user_id: userId,
    });
  } catch (err) {
    // テーブル未作成やキー未設定でもフォーム自体は失敗させない（メール送信で補完）
    console.error('[contact] DB保存に失敗:', err instanceof Error ? err.message : err);
  }

  // メール送信（運営通知＋自動返信・ベストエフォート）
  try {
    await sendContactEmails({
      name,
      email,
      categoryLabel: CATEGORY_LABELS[category],
      message,
    });
  } catch (err) {
    console.error('[contact] メール送信に失敗:', err instanceof Error ? err.message : err);
  }

  return { ok: true };
}
