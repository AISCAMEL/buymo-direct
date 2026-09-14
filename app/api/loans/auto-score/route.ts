import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { calculateLoanScore } from '@/lib/loan-score';
import { monthlyPayment } from '@/lib/loan';

export const dynamic = 'force-dynamic';

/** POST /api/loans/auto-score — ローン自動スコアリング（認証必須）。 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    loan_application_id,
    vehicle_price,
    down_payment,
    term_months,
  } = body as {
    loan_application_id?: string;
    vehicle_price?: number;
    down_payment?: number;
    term_months?: number;
  };

  let vehiclePrice = vehicle_price ?? 0;
  let downPayment = down_payment ?? 0;
  let termMonths = term_months ?? 60;

  const service = createServiceClient();

  // If loan_application_id provided, fetch values from DB
  if (loan_application_id) {
    const { data: app } = await service
      .from('loan_applications')
      .select('vehicle_price, down_payment, term_months, applicant_id')
      .eq('id', loan_application_id)
      .maybeSingle();
    const a = app as { vehicle_price?: number; down_payment?: number; term_months?: number; applicant_id?: string } | null;
    if (!a) return NextResponse.json({ error: 'Loan application not found' }, { status: 404 });
    // Only the applicant or admin can score
    if (a.applicant_id !== user.id) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if ((profile as { role?: string } | null)?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    vehiclePrice = a.vehicle_price ?? vehiclePrice;
    downPayment = a.down_payment ?? downPayment;
    termMonths = a.term_months ?? termMonths;
  }

  // Fetch user's KYC grade from profile
  const { data: profile } = await service
    .from('profiles')
    .select('kyc_status')
    .eq('id', user.id)
    .maybeSingle();
  const kycStatus = (profile as { kyc_status?: string } | null)?.kyc_status;

  // Map kyc_status to grade proxy (simplified)
  const kycGrade = kycStatus === 'verified' ? 'B' as const : null;

  // Fetch member rank
  const { data: points } = await service
    .from('user_points')
    .select('rank')
    .eq('user_id', user.id)
    .maybeSingle();
  const memberRank = ((points as { rank?: string } | null)?.rank ?? 'bronze') as 'bronze' | 'silver' | 'gold' | 'platinum';

  // Count prior defaults (rejected loan applications treated as indicator)
  const { count: defaultCount } = await service
    .from('loan_applications')
    .select('*', { count: 'exact', head: true })
    .eq('applicant_id', user.id)
    .eq('status', 'rejected');

  const result = calculateLoanScore({
    vehiclePrice,
    downPayment,
    termMonths,
    kycGrade,
    priorDefaultCount: defaultCount ?? 0,
    memberRank,
  });

  // Calculate payment details
  const principal = Math.max(0, vehiclePrice - downPayment);
  const monthly = monthlyPayment(principal, result.recommendedRate, termMonths);
  const total = monthly * termMonths;
  const interest = Math.max(0, total - principal);

  // If loan_application_id provided, store score result
  if (loan_application_id) {
    await service
      .from('loan_applications')
      .update({
        est_monthly: monthly,
        note: `自動スコア: ${result.score}点 (${result.autoDecision}) / 推奨金利 ${result.recommendedRate}% / 最大融資額 ${result.maxApprovalAmount.toLocaleString()}円`,
      })
      .eq('id', loan_application_id);
  }

  return NextResponse.json({
    ...result,
    monthly_payment: monthly,
    total_payment: total,
    interest,
    loan_application_id: loan_application_id ?? null,
  });
}
