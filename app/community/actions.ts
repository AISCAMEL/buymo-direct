'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { analyzeMessage } from '@/lib/moderation';

const ALLOWED = ['beginner', 'question', 'consult', 'success'];

/** コミュニティに投稿（会員のみ・RLSで制御）。外部連絡先はマスキング。 */
export async function createPost(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/community');

  const title = String(formData.get('title') || '').trim();
  const bodyRaw = String(formData.get('body') || '').trim();
  const category = ALLOWED.includes(String(formData.get('category'))) ? String(formData.get('category')) : 'question';
  if (!title) return;

  const mod = bodyRaw ? analyzeMessage(bodyRaw) : null;
  const body = mod?.flagged ? mod.masked : bodyRaw;

  const { data, error } = await supabase
    .from('community_posts')
    .insert({ author_id: user.id, category, title, body: body || null })
    .select('id')
    .single();
  if (error || !data) return;

  revalidatePath('/community');
  redirect(`/community/${data.id}`);
}

/** コメントを投稿。外部連絡先はマスキング。 */
export async function addComment(postId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const raw = String(formData.get('body') || '').trim();
  if (!raw) return;
  const mod = analyzeMessage(raw);
  await supabase.from('community_comments').insert({
    post_id: postId,
    author_id: user.id,
    body: mod.flagged ? mod.masked : raw,
  });
  revalidatePath(`/community/${postId}`);
}

/** ピン留め切替（本部・作者）。 */
export async function togglePin(postId: string, pinned: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from('community_posts').update({ pinned, updated_at: new Date().toISOString() }).eq('id', postId);
  revalidatePath('/community');
  revalidatePath(`/community/${postId}`);
}

/** 投稿を削除（本部・作者）。 */
export async function deletePost(postId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('community_posts').delete().eq('id', postId);
  revalidatePath('/community');
  redirect('/community');
}
