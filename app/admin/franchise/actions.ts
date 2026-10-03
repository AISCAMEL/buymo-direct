'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

/** 入金確認（請求/振込が済んだ）。 */
export async function adminMarkFranchisePaid(id: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('franchise_applications')
    .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  await logAdminAction(ctx, 'franchise.paid', 'franchise_application', id);
  revalidatePath('/admin/franchise');
}

/** 請求済みに変更。 */
export async function adminMarkFranchiseInvoiced(id: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('franchise_applications')
    .update({ status: 'invoiced', updated_at: new Date().toISOString() })
    .eq('id', id);
  await logAdminAction(ctx, 'franchise.invoiced', 'franchise_application', id);
  revalidatePath('/admin/franchise');
}

/** 加盟承認：加盟店を作成し、業者（買取加盟）＋有料会員（月会費開始）に。 */
export async function adminApproveFranchise(id: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const svc = createServiceClient();

  const { data: appRow } = await svc
    .from('franchise_applications')
    .select('id, user_id, company_name, contact_name, phone, prefecture')
    .eq('id', id)
    .maybeSingle();
  const app = appRow as {
    user_id?: string; company_name?: string | null; contact_name?: string | null; phone?: string | null; prefecture?: string | null;
  } | null;
  if (!app?.user_id) return;

  // 既存の加盟店が無ければ作成
  const { data: existing } = await svc.from('dealers').select('id').eq('owner_id', app.user_id).maybeSingle();
  let dealerId = (existing as { id?: string } | null)?.id;
  if (!dealerId) {
    const now = new Date().toISOString();
    const { data: created } = await svc.from('dealers').insert({
      owner_id: app.user_id,
      name: app.company_name || app.contact_name || '（店舗名未設定）',
      phone: app.phone ?? null,
      prefecture: app.prefecture ?? null,
      status: 'approved',
      approved_at: now,
    }).select('id').single();
    dealerId = (created as { id?: string } | null)?.id;
    if (dealerId) {
      await svc.from('dealer_staff').insert({ dealer_id: dealerId, user_id: app.user_id, role: 'owner' }).then(() => {}, () => {});
    }
  }

  // 業者（買取加盟）＋ 有料会員（月会費開始）
  await svc.from('profiles').update({ account_type: 'business', business_kind: 'buyback', member_tier: 'paid' }).eq('id', app.user_id);

  await svc.from('franchise_applications')
    .update({ status: 'approved', decided_by: ctx.userId, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  await logAdminAction(ctx, 'franchise.approve', 'franchise_application', id, dealerId ?? undefined);
  revalidatePath('/admin/franchise');
}

/** 見送り。 */
export async function adminRejectFranchise(id: string): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('franchise_applications')
    .update({ status: 'rejected', decided_by: ctx.userId, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  await logAdminAction(ctx, 'franchise.reject', 'franchise_application', id);
  revalidatePath('/admin/franchise');
}
