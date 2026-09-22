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
