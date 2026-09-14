'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireDealer, generateApiKey } from '@/lib/dealer';
import { PREFECTURES } from '@/lib/constants';

// ─── 加盟店申込 ─────────────────────────────────────────────────────────────

export async function applyDealer(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/register');

  // 既存チェック
  const { data: existing } = await supabase
    .from('dealers')
    .select('id, status')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (existing) redirect('/dealer');

  const name = String(formData.get('name')).trim();
  const company_name = String(formData.get('company_name') || '').trim() || null;
  const prefecture = String(formData.get('prefecture'));
  const address = String(formData.get('address') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const website_url = String(formData.get('website_url') || '').trim() || null;
  const description = String(formData.get('description') || '').trim() || null;

  if (!name || !PREFECTURES.includes(prefecture)) return;

  const { data: dealer, error } = await supabase.from('dealers').insert({
    owner_id: user.id,
    name, company_name, prefecture, address, phone, website_url, description,
    status: 'pending',
  }).select('id').single();
  if (error || !dealer) return;

  // オーナーを dealer_staff にも登録
  await supabase.from('dealer_staff').insert({
    dealer_id: dealer.id,
    user_id: user.id,
    role: 'owner',
  });

  redirect('/dealer?applied=1');
}

// ─── 加盟店プロフィール更新 ───────────────────────────────────────────────────

export async function updateDealerProfile(formData: FormData): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  await (supabase as any)
    .from('dealers')
    .update({
      name: String(formData.get('name')).trim(),
      company_name: String(formData.get('company_name') || '').trim() || null,
      prefecture: String(formData.get('prefecture')),
      address: String(formData.get('address') || '').trim() || null,
      phone: String(formData.get('phone') || '').trim() || null,
      website_url: String(formData.get('website_url') || '').trim() || null,
      description: String(formData.get('description') || '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealer.dealerId);

  revalidatePath('/dealer/settings');
}

// ─── スタッフ招待 ─────────────────────────────────────────────────────────────

export async function inviteStaff(formData: FormData): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!['owner', 'manager'].includes(dealer.role)) return;

  const email = String(formData.get('email')).trim().toLowerCase();
  const role = String(formData.get('role')) as 'manager' | 'staff';

  await (supabase as any).from('dealer_invitations').insert({
    dealer_id: dealer.dealerId,
    email,
    role,
  });

  // TODO: send invitation email with token
  revalidatePath('/dealer/staff');
}

// ─── スタッフ削除 ─────────────────────────────────────────────────────────────

export async function removeStaff(staffId: string): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!['owner', 'manager'].includes(dealer.role)) return;

  await (supabase as any).from('dealer_staff').delete().eq('id', staffId).eq('dealer_id', dealer.dealerId);
  revalidatePath('/dealer/staff');
}

// ─── スタッフロール変更 ────────────────────────────────────────────────────────

export async function updateStaffRole(staffId: string, role: string): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  await (supabase as any)
    .from('dealer_staff')
    .update({ role })
    .eq('id', staffId)
    .eq('dealer_id', dealer.dealerId);

  revalidatePath('/dealer/staff');
}

// ─── API キー生成 ─────────────────────────────────────────────────────────────

export async function createApiKey(
  formData: FormData
): Promise<{ plain: string } | void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  const name = String(formData.get('name')).trim();
  if (!name) return;

  const { plain, hash, prefix } = generateApiKey();

  await (supabase as any).from('dealer_api_keys').insert({
    dealer_id: dealer.dealerId,
    name,
    key_prefix: prefix,
    key_hash: hash,
  });

  revalidatePath('/dealer/api-keys');
  return { plain };
}

// ─── API キー削除 ─────────────────────────────────────────────────────────────

export async function deleteApiKey(keyId: string): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  await (supabase as any).from('dealer_api_keys').delete().eq('id', keyId).eq('dealer_id', dealer.dealerId);
  revalidatePath('/dealer/api-keys');
}

// ─── Webhook 管理 ──────────────────────────────────────────────────────────────

export async function createWebhook(formData: FormData): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  const url = String(formData.get('url')).trim();
  const events = String(formData.get('events') || 'deal.completed').split(',').map((e) => e.trim());

  if (!url.startsWith('https://')) return;

  await (supabase as any).from('dealer_webhooks').insert({
    dealer_id: dealer.dealerId,
    url,
    events,
  });
  revalidatePath('/dealer/api-keys');
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  await (supabase as any).from('dealer_webhooks').delete().eq('id', webhookId).eq('dealer_id', dealer.dealerId);
  revalidatePath('/dealer/api-keys');
}

export async function toggleWebhook(webhookId: string, active: boolean): Promise<void> {
  const { dealer, supabase } = await requireDealer() as any;
  if (!dealer.isOwner) return;

  await (supabase as any).from('dealer_webhooks').update({ active }).eq('id', webhookId).eq('dealer_id', dealer.dealerId);
  revalidatePath('/dealer/api-keys');
}
