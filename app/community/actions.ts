'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { analyzeMessage } from '@/lib/moderation';
import { createNotification } from '@/lib/notifications';

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

  // 連投抑止：直近30秒以内に自分の投稿があればブロック
  const since = new Date(Date.now() - 30 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('community_posts')
    .select('id')
    .eq('author_id', user.id)
    .gte('created_at', since)
    .maybeSingle();
  if (recent) redirect(`/community/${(recent as { id: string }).id}`);

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

  // 投稿者へ通知（自分のコメントは除く）
  const { data: post } = await supabase.from('community_posts').select('author_id, title').eq('id', postId).maybeSingle();
  const authorId = (post as { author_id?: string | null } | null)?.author_id;
  if (authorId && authorId !== user.id) {
    const title = (post as { title?: string } | null)?.title ?? '投稿';
    createNotification(authorId, 'system', 'コミュニティに返信がありました', `「${title}」にコメントが付きました。`, `/community/${postId}`)
      .catch(() => {/* fire-and-forget */});
  }

  revalidatePath(`/community/${postId}`);
}

/** 解決済みマークの切替（作者・本部）。 */
export async function toggleResolved(postId: string, resolved: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from('community_posts').update({ resolved, updated_at: new Date().toISOString() }).eq('id', postId);
  revalidatePath('/community');
  revalidatePath(`/community/${postId}`);
}

/** いいねの切替。 */
export async function toggleLike(postId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase
    .from('community_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    await supabase.from('community_post_likes').delete().eq('id', (existing as { id: string }).id);
  } else {
    await supabase.from('community_post_likes').insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath('/community');
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
