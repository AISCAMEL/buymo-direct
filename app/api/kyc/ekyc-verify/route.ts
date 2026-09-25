import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyDocumentWithEkyc, type EkycResult } from '@/lib/ekyc';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kyc/ekyc-verify
 *
 * 手動アップロード型の本人確認。書類画像＋自撮り画像を eKYC プロバイダー
 * （TRUSTDOCK / 未設定時はモック）で検証し、承認時に profiles を verified に更新する。
 * 認証必須。
 *
 * Body (JSON): { document_image: base64, selfie_image?: base64, document_type }
 * レスポンス: { verified: boolean, error?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '本人確認にはログインが必要です' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    document_image?: string;
    selfie_image?: string;
    document_type?: EkycResult['documentType'];
  };

  if (!body.document_image) {
    return NextResponse.json({ error: '書類の画像が必要です' }, { status: 400 });
  }
  const documentType: EkycResult['documentType'] = body.document_type ?? 'drivers_license';

  // eKYC 検証（実プロバイダー or モック）
  const result = await verifyDocumentWithEkyc(
    body.document_image,
    body.selfie_image ?? '',
    documentType
  );

  const service = createServiceClient();
  const now = new Date().toISOString();

  if (!result.verified) {
    // 失敗の監査ログのみ記録し、結果を返す
    await service.from('audit_logs').insert({
      actor_id: user.id,
      action: 'kyc.ekyc.declined',
      target_type: 'kyc_verification',
      target_id: user.id,
      detail: `manual upload / ${result.error ?? 'not approved'}`,
    });
    return NextResponse.json({ verified: false, error: result.error ?? '本人確認できませんでした。もう一度お試しください。' });
  }

  // 二重ポイント付与を防ぐため、現在の状態を確認
  const { data: profileRow } = await service
    .from('profiles')
    .select('kyc_status')
    .eq('id', user.id)
    .maybeSingle();
  const alreadyVerified = (profileRow as { kyc_status?: string } | null)?.kyc_status === 'verified';

  // profiles を verified に更新
  await service
    .from('profiles')
    .update({ kyc_status: 'verified', kyc_verified_at: now })
    .eq('id', user.id);

  // kyc_documents に反映（あれば更新、なければ挿入）
  const { data: existingDoc } = await service
    .from('kyc_documents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingDoc) {
    await service
      .from('kyc_documents')
      .update({ status: 'verified', reviewed_at: now, note: 'eKYC（アップロード）による本人確認完了' })
      .eq('user_id', user.id);
  } else {
    await service.from('kyc_documents').insert({
      user_id: user.id,
      id_front_url: '',
      selfie_url: null,
      status: 'verified',
      note: 'eKYC（アップロード）による本人確認完了',
      submitted_at: now,
      reviewed_at: now,
    });
  }

  // 初回のみ 100 ポイント付与
  if (!alreadyVerified) {
    const { data: existing } = await service
      .from('user_points')
      .select('points')
      .eq('user_id', user.id)
      .maybeSingle();
    const currentPoints = (existing as { points?: number } | null)?.points ?? 0;
    await service
      .from('user_points')
      .upsert({ user_id: user.id, points: currentPoints + 100, updated_at: now }, { onConflict: 'user_id' });
    await service.from('point_transactions').insert({
      user_id: user.id,
      amount: 100,
      reason: 'kyc_ekyc_verified',
      ref_id: crypto.randomUUID(),
    });
  }

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'kyc.ekyc.verified',
    target_type: 'kyc_verification',
    target_id: user.id,
    detail: `manual upload / confidence=${result.confidence}`,
  });

  return NextResponse.json({ verified: true });
}
