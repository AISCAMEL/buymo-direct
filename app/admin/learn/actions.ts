'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminContext, logAdminAction } from '@/lib/admin';

function parse(formData: FormData) {
  return {
    title: String(formData.get('title') || '').trim(),
    slug: String(formData.get('slug') || '').trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
    summary: String(formData.get('summary') || '').trim() || null,
    body: String(formData.get('body') || '').trim() || null,
    category: String(formData.get('category') || 'basics'),
    is_premium: ['on', 'true'].includes(String(formData.get('is_premium') || '')),
    published: ['on', 'true'].includes(String(formData.get('published') || '')),
    sort: Math.round(Number(formData.get('sort')) || 0),
  };
}

export async function createLearning(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const v = parse(formData);
  if (!v.title || !v.slug) return;
  const { error } = await ctx.supabase.from('learning_contents').insert(v);
  if (error) return;
  await logAdminAction(ctx, 'learning.create', 'learning', v.slug);
  revalidatePath('/admin/learn');
  revalidatePath('/learn');
  redirect('/admin/learn');
}

export async function updateLearning(id: string, formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const v = parse(formData);
  if (!v.title || !v.slug) return;
  await ctx.supabase.from('learning_contents').update({ ...v, updated_at: new Date().toISOString() }).eq('id', id);
  await logAdminAction(ctx, 'learning.update', 'learning', id);
  revalidatePath('/admin/learn');
  revalidatePath('/learn');
  redirect('/admin/learn');
}

export async function deleteLearning(id: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('learning_contents').delete().eq('id', id);
  await logAdminAction(ctx, 'learning.delete', 'learning', id);
  revalidatePath('/admin/learn');
  revalidatePath('/learn');
  redirect('/admin/learn');
}

export async function toggleLearningPublished(id: string, published: boolean): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('learning_contents').update({ published, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/learn');
  revalidatePath('/learn');
}
