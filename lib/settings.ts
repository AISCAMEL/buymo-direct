import { createServiceClient } from '@/lib/supabase/service';
import { mergePricingConfig, type PricingConfig } from '@/lib/pricing-config';

/** 料金設定を取得（DB→デフォルトにマージ）。ベストエフォート。 */
export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const service = createServiceClient();
    const { data } = await service.from('app_settings').select('value').eq('key', 'pricing').maybeSingle();
    const value = (data as { value?: unknown } | null)?.value ?? null;
    return mergePricingConfig(value as Partial<PricingConfig> | null);
  } catch {
    return mergePricingConfig(null);
  }
}

// ── エスクロー保全口座（銀行振込の振込先） ───────────────────────────────
export type BankAccount = {
  bankName: string;
  branchName: string;
  accountType: string; // 普通 / 当座
  accountNumber: string;
  accountHolder: string;
  note: string;
};

export const EMPTY_BANK_ACCOUNT: BankAccount = {
  bankName: '',
  branchName: '',
  accountType: '普通',
  accountNumber: '',
  accountHolder: '',
  note: '',
};

/** 保全口座情報を取得（未設定時は空）。ベストエフォート。 */
export async function getBankAccount(): Promise<BankAccount> {
  try {
    const service = createServiceClient();
    const { data } = await service.from('app_settings').select('value').eq('key', 'bank_account').maybeSingle();
    const v = (data as { value?: Partial<BankAccount> } | null)?.value ?? null;
    if (!v) return { ...EMPTY_BANK_ACCOUNT };
    return { ...EMPTY_BANK_ACCOUNT, ...v };
  } catch {
    return { ...EMPTY_BANK_ACCOUNT };
  }
}

/** 保全口座が入力済みか（表示可否の判定に使用）。 */
export function isBankAccountSet(a: BankAccount): boolean {
  return !!(a.bankName && a.accountNumber && a.accountHolder);
}
