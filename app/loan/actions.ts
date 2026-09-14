'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LOAN_APR_FROM } from '@/lib/constants';
import { LOAN_TERMS, monthlyPayment } from '@/lib/loan';
import { sendEmail, emailLayout, opsEmail } from '@/lib/email';
import { formatYen } from '@/lib/format';

export interface LoanApplyInput {
  listingId?: string;
  fullName: string;
  phone: string;
  email: string;
  birthYear?: number;
  annualIncome?: number;
  employment?: string;
  vehiclePrice: number;
  downPayment: number;
  termMonths: number;
  note?: string;
}

/** ローン仮審査申込を登録（要ログイン・本人のみ／RLS）。 */
export async function submitLoanApplication(
  input: LoanApplyInput
): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '申込にはログインが必要です' };

  if (!input.fullName.trim() || !input.phone.trim() || !input.email.trim()) {
    return { error: '氏名・電話・メールは必須です' };
  }
  const term = LOAN_TERMS.includes(input.termMonths) ? input.termMonths : 60;
  const financed = Math.max(0, input.vehiclePrice - Math.max(0, input.downPayment));
  const est = monthlyPayment(financed, LOAN_APR_FROM, term);

  const { data, error } = await supabase
    .from('loan_applications')
    .insert({
      applicant_id: user.id,
      listing_id: input.listingId ?? null,
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      birth_year: input.birthYear ?? null,
      annual_income: input.annualIncome ?? null,
      employment: input.employment ?? null,
      vehicle_price: input.vehiclePrice,
      down_payment: Math.max(0, input.downPayment),
      term_months: term,
      est_monthly: est,
      note: input.note?.trim() || null,
      status: 'submitted',
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? '申込の保存に失敗しました' };

  // 運営へ通知（ベストエフォート）
  const ops = opsEmail();
  if (ops) {
    await sendEmail({
      to: ops,
      subject: `【ローン仮審査】新規申込 - ${input.fullName.trim()}`,
      html: emailLayout(
        'ローン仮審査の新規申込',
        `<p>${input.fullName.trim()} 様より仮審査の申込がありました。</p>
         <ul>
           <li>電話: ${input.phone.trim()}</li>
           <li>メール: ${input.email.trim()}</li>
           <li>車両価格: ${formatYen(input.vehiclePrice)} / 頭金 ${formatYen(input.downPayment)} / ${term}回</li>
           <li>月々目安: ${formatYen(est)}</li>
         </ul>
         <p>管理画面の「ローン審査」からご対応ください。</p>`
      ),
    });
  }

  return { error: null, id: data.id };
}
