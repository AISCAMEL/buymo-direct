import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { calculateKycScore } from '@/lib/kyc-score';

export const dynamic = 'force-dynamic';

/** POST /api/kyc/auto-score — KYC 自動スコアリング（管理者専用）。 */
export async function POST(req: NextRequest) {
  // Admin check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { kyc_id } = body as { kyc_id?: string };
  if (!kyc_id) {
    return NextResponse.json({ error: 'kyc_id is required' }, { status: 400 });
  }

  const service = createServiceClient();

  // Fetch KYC document
  const { data: kycDoc, error: kycErr } = await service
    .from('kyc_documents')
    .select('*, profiles(kyc_status, created_at)')
    .eq('id', kyc_id)
    .maybeSingle();

  if (kycErr || !kycDoc) {
    return NextResponse.json({ error: 'KYC record not found' }, { status: 404 });
  }

  const doc = kycDoc as any;

  // Count prior completed transactions
  const { count: txCount } = await service
    .from('escrow_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('buyer_id', doc.user_id)
    .eq('status', 'completed');

  // Calculate account age
  const createdAt = doc.profiles?.created_at
    ? new Date(doc.profiles.created_at)
    : new Date();
  const accountAgeDays = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Infer document types from stored URL paths / note field.
  // The KYC form stores id_front_url; we treat presence as drivers license.
  // hasMyNumber / hasPassport would require separate fields — we use conservative defaults.
  const hasDriversLicense = Boolean(doc.id_front_url);
  const hasMyNumber = false;
  const hasPassport = Boolean(doc.selfie_url); // treat selfie presence as passport proxy for now

  const result = calculateKycScore({
    hasDriversLicense,
    hasMyNumber,
    hasPassport,
    phoneVerified: false, // phone_verified not in kyc_documents; defaults to false
    emailVerified: true,  // Supabase auth implies email verified
    accountAgeDays,
    priorTransactions: txCount ?? 0,
  });

  const now = new Date().toISOString();

  if (result.autoDecision === 'approved') {
    // Update KYC status to verified
    await service
      .from('kyc_documents')
      .update({ status: 'verified', reviewed_at: now, note: `自動審査: スコア ${result.score} (${result.grade}級)` })
      .eq('id', kyc_id);
    await service
      .from('profiles')
      .update({ kyc_status: 'verified', kyc_verified_at: now })
      .eq('id', doc.user_id);

    // Award 100 points for auto-approval
    const { data: existing } = await service
      .from('user_points')
      .select('points')
      .eq('user_id', doc.user_id)
      .maybeSingle();
    const currentPoints = (existing as { points?: number } | null)?.points ?? 0;
    await service
      .from('user_points')
      .upsert({ user_id: doc.user_id, points: currentPoints + 100, updated_at: now }, { onConflict: 'user_id' });
    await service
      .from('point_transactions')
      .insert({ user_id: doc.user_id, amount: 100, reason: 'kyc_auto_approved', ref_id: kyc_id });

  } else if (result.autoDecision === 'rejected') {
    await service
      .from('kyc_documents')
      .update({ status: 'rejected', reviewed_at: now, note: `自動審査: スコア ${result.score} (${result.grade}級) - ${result.reasons.join(', ')}` })
      .eq('id', kyc_id);
    await service
      .from('profiles')
      .update({ kyc_status: 'rejected' })
      .eq('id', doc.user_id);

  } else {
    // manual_review — leave KYC status unchanged, add note
    await service
      .from('kyc_documents')
      .update({ note: `自動審査: スコア ${result.score} (${result.grade}級) — 手動審査が必要です` })
      .eq('id', kyc_id);
  }

  // Audit log
  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: `kyc.auto_score.${result.autoDecision}`,
    target_type: 'kyc',
    target_id: kyc_id,
    detail: `score=${result.score} grade=${result.grade}`,
  });

  return NextResponse.json({ ...result, kyc_id });
}
