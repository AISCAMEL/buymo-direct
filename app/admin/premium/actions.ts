'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminContext, logAdminAction } from '@/lib/admin';

const CATS = ['market', 'sourcing', 'doc', 'video'];

function parse(formData: FormData) {
  return {
    category: CATS.includes(String(formData.get('category'))) ? String(formData.get('category')) : 'market',
    title: String(formData.get('title') || '').trim(),
    summary: String(formData.get('summary') || '').trim() || null,
    body: String(formData.get('body') || '').trim() || null,
    url: String(formData.get('url') || '').trim() || null,
    video_url: String(formData.get('video_url') || '').trim() || null,
    sort: Math.round(Number(formData.get('sort')) || 0),
    published: ['on', 'true'].includes(String(formData.get('published') || '')),
  };
}

/** コンテンツを追加。 */
export async function addPremiumResource(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const v = parse(formData);
  if (!v.title) return;
  await ctx.supabase.from('premium_resources').insert(v);
  await logAdminAction(ctx, 'premium.add', 'premium_resource', v.title);
  revalidatePath('/admin/premium');
  revalidatePath('/premium');
}

/** 既存コンテンツを編集。 */
export async function updatePremiumResource(id: string, formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const v = parse(formData);
  if (!v.title) return;
  await ctx.supabase.from('premium_resources').update({ ...v, updated_at: new Date().toISOString() }).eq('id', id);
  await logAdminAction(ctx, 'premium.update', 'premium_resource', id);
  revalidatePath('/admin/premium');
  revalidatePath('/premium');
  redirect('/admin/premium');
}

/** 公開/非公開の切替。 */
export async function togglePremiumResource(id: string, published: boolean): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('premium_resources').update({ published, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/premium');
  revalidatePath('/premium');
}

/** 削除。 */
export async function deletePremiumResource(id: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('premium_resources').delete().eq('id', id);
  await logAdminAction(ctx, 'premium.delete', 'premium_resource', id);
  revalidatePath('/admin/premium');
  revalidatePath('/premium');
}
