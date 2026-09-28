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

  const str = (k: string) => String(formData.get(k) || '').trim() || null;
  let gallery: string[] = [];
  try {
    const g = JSON.parse(String(formData.get('gallery') || '[]'));
    if (Array.isArray(g)) gallery = g.filter((u) => typeof u === 'string').slice(0, 12);
  } catch { gallery = []; }

  await (supabase as any)
    .from('dealers')
    .update({
      name: String(formData.get('name')).trim(),
      company_name: str('company_name'),
      prefecture: String(formData.get('prefecture')),
      address: str('address'),
      phone: str('phone'),
      website_url: str('website_url'),
      description: str('description'),
      // 追加プロフィール項目
      tagline: str('tagline'),
      cover_url: str('cover_url'),
      logo_url: str('logo_url'),
      rep_name: str('rep_name'),
      rep_photo_url: str('rep_photo_url'),
      rep_message: str('rep_message'),
      business_hours: str('business_hours'),
      holidays: str('holidays'),
      established: str('established'),
      service_area: str('service_area'),
      instagram_url: str('instagram_url'),
      line_url: str('line_url'),
      gallery,
      // 事業者情報・インボイス
      business_type: String(formData.get('business_type') || 'corporation') === 'sole_proprietor' ? 'sole_proprietor' : 'corporation',
      corporate_number: str('corporate_number'),
      trade_name: str('trade_name'),
      representative: str('representative'),
      antique_license_no: str('antique_license_no'),
      tax_status: String(formData.get('tax_status') || 'taxable') === 'exempt' ? 'exempt' : 'taxable',
      invoice_registered: ['on', 'true'].includes(String(formData.get('invoice_registered') || '')),
      invoice_number: str('invoice_number'),
      bank_info: str('bank_info'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealer.dealerId);

  revalidatePath('/dealer/settings');
  revalidatePath(`/dealers/${dealer.dealerId}`);
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
