'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const ALLOWED = ['q', 'maker', 'model', 'body', 'pref', 'price', 'year', 'mileage', 'fuel', 'transmission', 'norepair', 'sort'];

/** 現在の検索条件を保存（要ログイン）。 */
export async function saveSearch(
  name: string,
  params: Record<string, string>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '保存にはログインが必要です' };

  // 許可キーのみ抽出
  const clean: Record<string, string> = {};
  for (const k of ALLOWED) {
    const v = params[k];
    if (v) clean[k] = String(v);
  }

  const { error } = await supabase.from('saved_searches').insert({
    user_id: user.id,
    name: name.trim() || '保存した検索',
    params: clean,
  });
  if (error) return { error: error.message };

  revalidatePath('/dashboard/searches');
  return { error: null };
}

/** 保存検索を削除。 */
export async function deleteSavedSearch(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('saved_searches').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/dashboard/searches');
}
