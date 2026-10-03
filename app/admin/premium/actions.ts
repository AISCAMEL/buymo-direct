'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';

const CATS = ['market', 'sourcing', 'doc', 'video'];

/** コンテンツを追加。 */
export async function addPremiumResource(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const title = String(formData.get('title') || '').trim();
  if (!title) return;
  const category = CATS.includes(String(formData.get('category'))) ? String(formData.get('category')) : 'market';
  const sort = Math.round(Number(formData.get('sort')) || 0);
  await ctx.supabase.from('premium_resources').insert({
    category,
    title,
    summary: String(formData.get('summary') || '').trim() || null,
    body: String(formData.get('body') || '').trim() || null,
    url: String(formData.get('url') || '').trim() || null,
    sort,
    published: true,
  });
  await logAdminAction(ctx, 'premium.add', 'premium_resource', title);
  revalidatePath('/admin/premium');
  revalidatePath('/premium');
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
