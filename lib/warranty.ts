import { PRICING_DEFAULTS, WARRANTY_PERIOD_FACTOR, WARRANTY_MONTHS, type PricingConfig } from '@/lib/pricing-config';

export { WARRANTY_MONTHS };

// 輸入車ブランド（保証基本料が高め）
const IMPORT_MAKERS = new Set([
  'BMW', 'メルセデス・ベンツ', 'アウディ', 'フォルクスワーゲン', 'ボルボ', 'MINI', 'プジョー',
  'ルノー', 'フィアット', 'アバルト', 'ジープ', 'ポルシェ', 'テスラ', 'シトロエン',
  'アルファロメオ', 'ジャガー', 'ランドローバー', '輸入車（その他）',
]);

export function warrantyBase(maker: string | null | undefined, bodyType: string | null | undefined, cfg: PricingConfig = PRICING_DEFAULTS): number {
  if (bodyType && bodyType.includes('軽')) return cfg.warrantyBaseKei;
  if (maker && IMPORT_MAKERS.has(maker)) return cfg.warrantyBaseImport;
  return cfg.warrantyBaseDomestic;
}

/** 輸入車ブランドかどうか。 */
export function isImportMaker(maker: string | null | undefined): boolean {
  return !!maker && IMPORT_MAKERS.has(maker);
}

/** 保証料 = 基本料 × 年式係数 × 走行距離係数 × 期間係数（1,000円丸め・上限） */
export function estimateWarranty(
  opts: { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null; months: number },
  cfg: PricingConfig = PRICING_DEFAULTS,
): number | null {
  const pf = WARRANTY_PERIOD_FACTOR[opts.months];
  if (!pf) return null;
  const base = warrantyBase(opts.maker, opts.bodyType, cfg);
  const now = new Date().getFullYear();
  const age = opts.year ? Math.max(0, now - opts.year) : 0;
  const ageFactor = 1 + Math.max(0, age - cfg.warrantyAgeFreeYears) * cfg.warrantyAgeStep;
  const km = opts.mileageKm ?? 0;
  const mileageFactor = 1 + Math.max(0, (km - cfg.warrantyMileageFreeKm) / 10000) * cfg.warrantyMileageStep;
  const raw = base * ageFactor * mileageFactor * pf;
  return Math.round(Math.min(raw, cfg.warrantyCap) / 1000) * 1000;
}
