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

// ── コラム画像生成のスタイル設定（管理画面で編集可能） ─────────────────────
export const SETTING_IMAGE_STYLE = 'column_image_style';
export const SETTING_IMAGE_REF = 'column_image_ref_url';

/** 画像生成のスタイル指示文（被写体は別途 append する）。 */
export const DEFAULT_IMAGE_STYLE =
  'A professional photorealistic photograph for an Instagram post, for a Japanese used-car marketplace. ' +
  'Shot like a real high-end DSLR photo: natural lighting, true-to-life colors, realistic materials and textures, shallow depth of field, ' +
  'authentic Japanese setting where relevant (real cars, real paper documents, car dealership, Japanese street or home). ' +
  'It MUST look like a REAL photograph — absolutely NOT an illustration, NOT a 3D render, NOT CGI, NOT a cartoon, NOT a flat graphic. ' +
  'The image MUST be a perfect SQUARE with a 1:1 aspect ratio, full-bleed and filling the entire frame edge to edge — no borders, no black bars, no letterboxing, no padding. ' +
  'No text, no letters, no numbers, no watermark, no logos.';

/** app_settings から文字列設定を取得（jsonb に文字列で保存）。未設定は null。 */
export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const service = createServiceClient();
    const { data } = await service.from('app_settings').select('value').eq('key', key).maybeSingle();
    const v = (data as { value?: unknown } | null)?.value ?? null;
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && 'text' in (v as Record<string, unknown>)) return String((v as Record<string, unknown>).text ?? '');
    return String(v);
  } catch {
    return null;
  }
}

/** app_settings へ文字列設定を保存（upsert）。 */
export async function setAppSetting(key: string, value: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const service = createServiceClient();
    const { error } = await service
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

/** 現在の画像スタイル指示文（未設定なら既定）。 */
export async function getImageStyle(): Promise<string> {
  const s = await getAppSetting(SETTING_IMAGE_STYLE);
  return s && s.trim() ? s : DEFAULT_IMAGE_STYLE;
}

/** 現在の基準画像URL（スタイル参照用）。未設定なら null。 */
export async function getImageRef(): Promise<string | null> {
  const s = await getAppSetting(SETTING_IMAGE_REF);
  return s && s.trim() ? s : null;
}
