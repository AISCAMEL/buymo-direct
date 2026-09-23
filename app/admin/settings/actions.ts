'use server';

import { revalidatePath } from 'next/cache';
import { isAdminUser } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { mergePricingConfig, type PricingConfig } from '@/lib/pricing-config';

const n = (fd: FormData, key: string, fallback: number): number => {
  const v = Number(fd.get(key));
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};
// 符号あり（割引でマイナス可）
const sn = (fd: FormData, key: string, fallback: number): number => {
  const v = Number(fd.get(key));
  return Number.isFinite(v) ? v : fallback;
};

/** 料金・係数設定を保存（管理者のみ）。%入力は小数に変換して保存。 */
export async function savePricingConfig(formData: FormData): Promise<void> {
  if (!(await isAdminUser())) return;

  const cfg: PricingConfig = mergePricingConfig({
    escrowTiers: [
      { max: n(formData, 'esc_max1', 1_000_000), fee: n(formData, 'esc_fee1', 19800) },
      { max: n(formData, 'esc_max2', 2_000_000), fee: n(formData, 'esc_fee2', 39800) },
      { max: n(formData, 'esc_max3', 4_000_000), fee: n(formData, 'esc_fee3', 59800) },
      { max: null, fee: n(formData, 'esc_fee4', 79800) },
    ],
    loanRate: n(formData, 'loan_rate_pct', 3.6) / 100,
    loanFeeMin: n(formData, 'loan_fee_min', 11000),
    transferNormal: n(formData, 'transfer_normal', 19800),
    transferKei: n(formData, 'transfer_kei', 13200),
    warrantyBaseKei: n(formData, 'w_base_kei', 12000),
    warrantyBaseDomestic: n(formData, 'w_base_dom', 18000),
    warrantyBaseImport: n(formData, 'w_base_imp', 40000),
    warrantyAgeFreeYears: n(formData, 'w_age_free', 3),
    warrantyAgeStep: n(formData, 'w_age_step_pct', 8) / 100,
    warrantyMileageFreeKm: n(formData, 'w_km_free', 50000),
    warrantyMileageStep: n(formData, 'w_km_step_pct', 5) / 100,
    warrantyCap: n(formData, 'w_cap', 150000),
    warrantyAdjustPercent: sn(formData, 'w_adjust_pct', 0),
  });

  try {
    const service = createServiceClient();
    await service.from('app_settings').upsert({ key: 'pricing', value: cfg, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[settings] 保存に失敗:', err instanceof Error ? err.message : err);
  }

  revalidatePath('/admin/settings');
  revalidatePath('/loan/apply');
  revalidatePath('/listings', 'layout');
}
