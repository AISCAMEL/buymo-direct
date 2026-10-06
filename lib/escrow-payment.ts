// エスクロー入金（Square）の確定処理。1回払い／2回分割払いの両対応。
// 冪等性：各回の入金フラグは `*_paid=false` の行だけを更新し、funds_held への遷移は
// `status='initiated'` の行だけを更新するため、Webhook の再送でも二重処理されない。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

function orList(col: string, ids: string[]): string {
  return `${col}.in.(${ids.map((s) => `"${s}"`).join(',')})`;
}

/**
 * payment.completed を受けて、該当する回の入金を記録し、
 * 必要な回がすべて完了したら funds_held へ遷移させる。
 * @returns 遷移・更新が発生したエスクローID（revalidate 用）／なければ null
 */
export async function settleSquarePaymentCompleted(supabase: DB, matchIds: string[]): Promise<string | null> {
  if (!matchIds.length) return null;

  // 1本目（square_payment_id）に一致 → 1回目を入金済みに
  await supabase
    .from('escrow_transactions')
    .update({ installment_1_paid: true })
    .in('square_payment_id', matchIds)
    .eq('installment_1_paid', false)
    .eq('status', 'initiated');

  // 2本目（square_payment_id_2）に一致 → 2回目を入金済みに
  await supabase
    .from('escrow_transactions')
    .update({ installment_2_paid: true })
    .in('square_payment_id_2', matchIds)
    .eq('installment_2_paid', false)
    .eq('status', 'initiated');

  // 1回払い：1回目入金で funds_held
  const { data: a } = await supabase
    .from('escrow_transactions')
    .update({ status: 'funds_held' })
    .in('square_payment_id', matchIds)
    .eq('status', 'initiated')
    .eq('installment_count', 1)
    .eq('installment_1_paid', true)
    .select('id')
    .maybeSingle();

  // 2回払い：両方の入金が揃ったときだけ funds_held（半額入金では絶対に遷移しない）
  const { data: b } = await supabase
    .from('escrow_transactions')
    .update({ status: 'funds_held' })
    .or(`${orList('square_payment_id', matchIds)},${orList('square_payment_id_2', matchIds)}`)
    .eq('status', 'initiated')
    .eq('installment_count', 2)
    .eq('installment_1_paid', true)
    .eq('installment_2_paid', true)
    .select('id')
    .maybeSingle();

  return (a?.id as string | undefined) ?? (b?.id as string | undefined) ?? null;
}

/**
 * payment.failed を受けて、該当する回の Square 識別子をクリアし、再入金を促す。
 */
export async function clearFailedSquarePayment(supabase: DB, matchIds: string[]): Promise<void> {
  if (!matchIds.length) return;
  await supabase
    .from('escrow_transactions')
    .update({ square_payment_id: null })
    .in('square_payment_id', matchIds)
    .eq('status', 'initiated');
  await supabase
    .from('escrow_transactions')
    .update({ square_payment_id_2: null })
    .in('square_payment_id_2', matchIds)
    .eq('status', 'initiated');
}
