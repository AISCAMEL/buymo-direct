'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { recordDealerSaleCommission } from '@/lib/sale-commission';
import { sendEmail, emailLayout } from '@/lib/email';
import type { ListingStatus, EscrowStatus, LoanAppStatus, ReportStatus, AnnouncementLevel } from '@/lib/types';

const LOAN_STATUS_JA: Record<LoanAppStatus, string> = {
  submitted: '受付', reviewing: '審査中', approved: '承認', rejected: '否決',
};

/** 出品のモデレーション（非公開/復帰）。 */
export async function adminSetListingStatus(listingId: string, status: ListingStatus) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('listings').update({ status }).eq('id', listingId);
  await logAdminAction(ctx, `listing.status.${status}`, 'listing', listingId);
  revalidatePath('/admin/listings');
}

/** 出品の削除。 */
export async function adminDeleteListing(listingId: string) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('listings').delete().eq('id', listingId);
  await logAdminAction(ctx, 'listing.delete', 'listing', listingId);
  revalidatePath('/admin/listings');
}

/** 取引ステータスの管理者上書き（係争/キャンセル等）。 */
export async function adminSetEscrowStatus(escrowId: string, status: EscrowStatus) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('escrow_transactions').update({ status }).eq('id', escrowId);
  // 完了に変更した場合、加盟店の自社在庫なら成果報酬を記録
  if (status === 'completed') {
    await recordDealerSaleCommission(escrowId);
  }
  await logAdminAction(ctx, `escrow.status.${status}`, 'escrow', escrowId);
  revalidatePath('/admin/escrow');
}

/** ローン仮審査のステータス変更。 */
export async function adminSetLoanStatus(appId: string, status: LoanAppStatus) {
  const ctx = await adminContext();
  if (!ctx) return;

  // 申込者情報を取得して更新
  const { data: app } = await ctx.supabase
    .from('loan_applications')
    .select('email, full_name')
    .eq('id', appId)
    .maybeSingle();
  await ctx.supabase.from('loan_applications').update({ status }).eq('id', appId);
  await logAdminAction(ctx, `loan.status.${status}`, 'loan', appId);

  // 承認/否決は申込者へ通知（ベストエフォート）
  const a = app as { email?: string; full_name?: string } | null;
  if (a?.email && (status === 'approved' || status === 'rejected')) {
    await sendEmail({
      to: a.email,
      subject: `【ローン仮審査】審査結果のお知らせ（${LOAN_STATUS_JA[status]}）`,
      html: emailLayout(
        'ローン仮審査の結果',
        `<p>${a.full_name ?? 'お客'} 様</p>
         <p>お申込みいただいたローン仮審査の結果は <strong>${LOAN_STATUS_JA[status]}</strong> となりました。</p>
         ${status === 'approved'
           ? '<p>詳細は担当者よりご連絡いたします。今しばらくお待ちください。</p>'
           : '<p>誠に恐れ入りますが、今回はご希望に添えませんでした。条件を変えての再申込も可能です。</p>'}`
      ),
    });
  }
  revalidatePath('/admin/loans');
}

/** 通報のステータス変更。 */
export async function adminSetReportStatus(reportId: string, status: ReportStatus) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('reports').update({ status }).eq('id', reportId);
  await logAdminAction(ctx, `report.status.${status}`, 'report', reportId);
  revalidatePath('/admin/reports');
}

/** お知らせを作成（フォーム送信）。 */
export async function adminCreateAnnouncement(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const level = String(formData.get('level') ?? 'info') as AnnouncementLevel;
  const pinned = formData.get('pinned') === 'on';
  if (!title || !body) return;

  const { data } = await ctx.supabase
    .from('announcements')
    .insert({ title, body, level, pinned, published: true })
    .select('id')
    .single();
  if (data) await logAdminAction(ctx, 'announcement.create', 'announcement', data.id, title);
  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
}

/** お知らせの公開/非公開を切替。 */
export async function adminSetAnnouncementPublished(id: string, published: boolean) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('announcements').update({ published }).eq('id', id);
  await logAdminAction(ctx, `announcement.${published ? 'publish' : 'unpublish'}`, 'announcement', id);
  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
}

/** お知らせを削除。 */
export async function adminDeleteAnnouncement(id: string) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('announcements').delete().eq('id', id);
  await logAdminAction(ctx, 'announcement.delete', 'announcement', id);
  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
}

/** お知らせのピン留めを切替。 */
export async function adminSetAnnouncementPinned(id: string, pinned: boolean) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('announcements').update({ pinned }).eq('id', id);
  await logAdminAction(ctx, `announcement.${pinned ? 'pin' : 'unpin'}`, 'announcement', id);
  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
}

/** KYC 書類を承認。profiles.kyc_status を 'verified' に更新。 */
export async function adminApproveKyc(userId: string) {
  const ctx = await adminContext();
  if (!ctx) return;

  const now = new Date().toISOString();

  // 承認前の状態を確認（ポイント二重付与の防止）
  const { data: beforeRow } = await ctx.supabase
    .from('profiles')
    .select('kyc_status')
    .eq('id', userId)
    .maybeSingle();
  const alreadyVerified = (beforeRow as { kyc_status?: string } | null)?.kyc_status === 'verified';

  await ctx.supabase
    .from('kyc_documents')
    .update({ status: 'verified', reviewed_at: now, note: null })
    .eq('user_id', userId);
  await ctx.supabase
    .from('profiles')
    .update({ kyc_status: 'verified', kyc_verified_at: now })
    .eq('id', userId);

  // 初回承認時のみ 100 ポイントを付与（対象ユーザーへの書き込みは service role）
  if (!alreadyVerified) {
    try {
      const service = createServiceClient();
      const { data: existing } = await service
        .from('user_points')
        .select('points')
        .eq('user_id', userId)
        .maybeSingle();
      const currentPoints = (existing as { points?: number } | null)?.points ?? 0;
      await service
        .from('user_points')
        .upsert({ user_id: userId, points: currentPoints + 100, updated_at: now }, { onConflict: 'user_id' });
      await service.from('point_transactions').insert({
        user_id: userId,
        amount: 100,
        reason: 'kyc_verified',
        ref_id: crypto.randomUUID(),
      });
    } catch { /* ポイント付与の失敗は本人確認の承認を妨げない */ }
  }

  await logAdminAction(ctx, 'kyc.approve', 'user', userId);
  revalidatePath('/admin/kyc');
}

/** KYC 書類を却下。profiles.kyc_status を 'rejected' に更新。 */
export async function adminRejectKyc(userId: string, note?: string) {
  const ctx = await adminContext();
  if (!ctx) return;

  const now = new Date().toISOString();
  await ctx.supabase
    .from('kyc_documents')
    .update({ status: 'rejected', reviewed_at: now, note: note ?? null })
    .eq('user_id', userId);
  await ctx.supabase
    .from('profiles')
    .update({ kyc_status: 'rejected' })
    .eq('id', userId);

  await logAdminAction(ctx, 'kyc.reject', 'user', userId, note);
  revalidatePath('/admin/kyc');
}

/** マッチング手数料の請求ステータスを変更（請求済み/入金済み/免除/取消）。 */
export async function adminSetChargeStatus(chargeId: string, status: string) {
  const ctx = await adminContext();
  if (!ctx) return;

  // 書き込みは service role（case_charges は参照のみの RLS）
  const service = createServiceClient();
  await service
    .from('case_charges')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', chargeId);

  await logAdminAction(ctx, `charge.status.${status}`, 'case_charge', chargeId);
  revalidatePath('/admin/billing');
}

/** 加盟店・プロ希望リードのステータスを変更。 */
export async function adminSetLeadStatus(leadId: string, status: string) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from('dealer_leads').update({ status, updated_at: new Date().toISOString() }).eq('id', leadId);
  await logAdminAction(ctx, `lead.status.${status}`, 'dealer_lead', leadId);
  revalidatePath('/admin/leads');
}

/** 有料会員の申込を承認（member_tier=paid）／却下。 */
export async function adminDecideMembership(appId: string, approve: boolean) {
  const ctx = await adminContext();
  if (!ctx) return;
  const { data: app } = await ctx.supabase.from('membership_applications').select('user_id').eq('id', appId).maybeSingle();
  const userId = (app as { user_id?: string } | null)?.user_id;
  const now = new Date().toISOString();
  await ctx.supabase
    .from('membership_applications')
    .update({ status: approve ? 'approved' : 'rejected', decided_by: ctx.userId, decided_at: now, updated_at: now })
    .eq('id', appId);
  if (approve && userId) {
    await ctx.supabase.from('profiles').update({ member_tier: 'paid' }).eq('id', userId);
  }
  await logAdminAction(ctx, `membership.${approve ? 'approve' : 'reject'}`, 'user', userId ?? appId);
  revalidatePath('/admin/members');
}

/** 会員の有料/無料を切替。 */
export async function adminSetMemberTier(userId: string, tier: string) {
  const ctx = await adminContext();
  if (!ctx) return;
  const t = tier === 'paid' ? 'paid' : 'free';
  await ctx.supabase.from('profiles').update({ member_tier: t }).eq('id', userId);
  await logAdminAction(ctx, `member.tier.${t}`, 'user', userId);
  revalidatePath('/admin/leads');
}

/** 販売手数料（成果報酬）の請求ステータスを変更。 */
export async function adminSetSaleCommissionStatus(commissionId: string, status: string) {
  const ctx = await adminContext();
  if (!ctx) return;
  const service = createServiceClient();
  await service
    .from('sale_commissions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', commissionId);
  await logAdminAction(ctx, `sale_commission.status.${status}`, 'sale_commission', commissionId);
  revalidatePath('/admin/billing');
}
