import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kyc/ekyc-callback
 *
 * TRUSTDOCK（またはモック）から呼ばれる認証完了コールバック。
 *
 * クエリパラメータ:
 *   session_id  — eKYC セッション ID
 *   status      — "approved" | "declined" | "error" | "pending"
 *
 * 処理:
 *   1. kyc_verifications レコードを更新
 *   2. 承認時: profiles.kyc_status を "verified" に更新、100 ポイント付与
 *   3. /dashboard/kyc?result=success または ?result=failed にリダイレクト
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  const rawStatus = searchParams.get('status') ?? 'pending';

  // フォールバック先
  const fallbackRedirect = '/dashboard/kyc';

  if (!sessionId) {
    return NextResponse.redirect(
      new URL(`${fallbackRedirect}?result=failed&reason=no_session_id`, req.url)
    );
  }

  const service = createServiceClient();
  const now = new Date().toISOString();

  // セッションレコードを取得
  const { data: session } = await service
    .from('kyc_verifications')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  const record = session as {
    user_id?: string;
    status?: string;
    redirect_url?: string;
  } | null;

  const userId = record?.user_id;
  const redirectBase = record?.redirect_url ?? fallbackRedirect;

  const isApproved = rawStatus === 'approved';
  const newStatus = isApproved ? 'verified' : rawStatus === 'error' ? 'failed' : 'declined';

  // kyc_verifications を更新
  await service
    .from('kyc_verifications')
    .update({
      status: newStatus,
      trustdock_status: rawStatus,
      updated_at: now,
    })
    .eq('id', sessionId);

  if (isApproved && userId) {
    // profiles.kyc_status を verified に更新
    await service
      .from('profiles')
      .update({ kyc_status: 'verified', kyc_verified_at: now })
      .eq('id', userId);

    // kyc_documents にも反映（既存レコードがあれば更新、なければ挿入）
    const { data: existingDoc } = await service
      .from('kyc_documents')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingDoc) {
      await service
        .from('kyc_documents')
        .update({ status: 'verified', reviewed_at: now, note: 'eKYC（TRUSTDOCK）による本人確認完了' })
        .eq('user_id', userId);
    } else {
      await service.from('kyc_documents').insert({
        user_id: userId,
        id_front_url: '',
        selfie_url: null,
        status: 'verified',
        note: 'eKYC（TRUSTDOCK）による本人確認完了',
        submitted_at: now,
        reviewed_at: now,
      });
    }

    // 100 ポイント付与
    const { data: existing } = await service
      .from('user_points')
      .select('points')
      .eq('user_id', userId)
      .maybeSingle();
    const currentPoints = (existing as { points?: number } | null)?.points ?? 0;

    await service
      .from('user_points')
      .upsert(
        { user_id: userId, points: currentPoints + 100, updated_at: now },
        { onConflict: 'user_id' }
      );
    await service.from('point_transactions').insert({
      user_id: userId,
      amount: 100,
      reason: 'kyc_ekyc_verified',
      ref_id: sessionId,
    });

    // 監査ログ
    await service.from('audit_logs').insert({
      actor_id: userId,
      action: 'kyc.ekyc.verified',
      target_type: 'kyc_verification',
      target_id: sessionId,
      detail: `trustdock_status=${rawStatus}`,
    });
  } else if (userId) {
    // 監査ログ（失敗）
    await service.from('audit_logs').insert({
      actor_id: userId,
      action: `kyc.ekyc.${newStatus}`,
      target_type: 'kyc_verification',
      target_id: sessionId,
      detail: `trustdock_status=${rawStatus}`,
    });
  }

  const resultParam = isApproved ? 'success' : 'failed';
  const redirectUrl = redirectBase.startsWith('http')
    ? new URL(`${redirectBase}?result=${resultParam}`)
    : new URL(`${redirectBase}?result=${resultParam}`, req.url);

  return NextResponse.redirect(redirectUrl);
}
