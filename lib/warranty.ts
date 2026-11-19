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

/* ── 車が未確定（手動入力）のときの「ざっくり概算」用：車両サイズから概算 ── */
export type VehicleSize = 'kei' | 'compact' | 'standard' | 'large' | 'import';
export const VEHICLE_SIZES: { code: VehicleSize; label: string; hint: string }[] = [
  { code: 'kei', label: '軽自動車', hint: '〜660cc' },
  { code: 'compact', label: 'コンパクト', hint: '小型・ハッチバック' },
  { code: 'standard', label: '普通車', hint: 'セダン・ミニバン・SUV' },
  { code: 'large', label: '大型・高級', hint: '大型SUV・高級車' },
  { code: 'import', label: '輸入車', hint: '外車全般' },
];
const SIZE_FACTOR: Record<VehicleSize, number> = { kei: 1, compact: 0.9, standard: 1, large: 1.25, import: 1 };

/** 車両サイズからおおよその故障保証料（税抜・1,000円丸め）を概算する。年式・走行は任意（無ければ標準扱い）。 */
export function estimateWarrantyBySize(
  size: VehicleSize,
  opts: { year?: number | null; mileageKm?: number | null; months: number },
  cfg: PricingConfig = PRICING_DEFAULTS,
): number | null {
  const bodyType = size === 'kei' ? '軽' : null;
  const maker = size === 'import' ? '輸入車（その他）' : null;
  const q = estimateWarranty({ year: opts.year ?? null, mileageKm: opts.mileageKm ?? null, maker, bodyType, months: opts.months }, cfg);
  if (q == null) return null;
  return Math.round((q * (SIZE_FACTOR[size] ?? 1)) / 1000) * 1000;
}
