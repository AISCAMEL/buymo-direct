'use server';

import { revalidatePath } from 'next/cache';
import { adminContext, logAdminAction } from '@/lib/admin';
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

/** KYC 書類を承認。profiles.kyc_status を 'verified' に更新。 */
export async function adminApproveKyc(userId: string) {
  const ctx = await adminContext();
  if (!ctx) return;

  const now = new Date().toISOString();
  await ctx.supabase
    .from('kyc_documents')
    .update({ status: 'verified', reviewed_at: now, note: null })
    .eq('user_id', userId);
  await ctx.supabase
    .from('profiles')
    .update({ kyc_status: 'verified', kyc_verified_at: now })
    .eq('id', userId);

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
