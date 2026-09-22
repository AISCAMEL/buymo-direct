// 料金・係数の設定（本部で編集可能）。デフォルト値はここに集約。
// クライアント/サーバー両方から import できるよう、副作用なしのプレーンな定義のみ。

export interface PricingConfig {
  // エスクロー（買い手・定額）：price が max 未満なら fee。最後は max=null（上限なし）。
  escrowTiers: { max: number | null; fee: number }[];
  // ローン手数料
  loanRate: number;       // 例 0.036
  loanFeeMin: number;     // 下限 例 11000
  // 名義変更代行
  transferNormal: number; // 普通車
  transferKei: number;    // 軽自動車
  // 保証（計算式）
  warrantyBaseKei: number;
  warrantyBaseDomestic: number;
  warrantyBaseImport: number;
  warrantyAgeFreeYears: number;  // 何年落ちまで係数1.0
  warrantyAgeStep: number;       // 1年ごとの加算（例 0.08 = +8%）
  warrantyMileageFreeKm: number; // 何kmまで係数1.0
  warrantyMileageStep: number;   // 1万kmごとの加算（例 0.05 = +5%）
  warrantyCap: number;           // 上限
}

export const PRICING_DEFAULTS: PricingConfig = {
  escrowTiers: [
    { max: 1_000_000, fee: 19800 },
    { max: 2_000_000, fee: 39800 },
    { max: 4_000_000, fee: 59800 },
    { max: null, fee: 79800 },
  ],
  loanRate: 0.036,
  loanFeeMin: 11000,
  transferNormal: 19800,
  transferKei: 13200,
  warrantyBaseKei: 12000,
  warrantyBaseDomestic: 18000,
  warrantyBaseImport: 40000,
  warrantyAgeFreeYears: 3,
  warrantyAgeStep: 0.08,
  warrantyMileageFreeKm: 50000,
  warrantyMileageStep: 0.05,
  warrantyCap: 150000,
};

// 期間係数は固定（6/12/24ヶ月）。
export const WARRANTY_PERIOD_FACTOR: Record<number, number> = { 6: 1.0, 12: 1.7, 24: 2.4 };
export const WARRANTY_MONTHS = [6, 12, 24] as const;

/** DB等から来た部分的な設定をデフォルトにマージ（数値のみ・不正値は無視）。 */
export function mergePricingConfig(partial?: Partial<PricingConfig> | null): PricingConfig {
  if (!partial || typeof partial !== 'object') return PRICING_DEFAULTS;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const tiers = Array.isArray(partial.escrowTiers) && partial.escrowTiers.length
    ? partial.escrowTiers
        .filter((t) => t && typeof t.fee === 'number')
        .map((t) => ({ max: t.max === null || typeof t.max === 'number' ? t.max : null, fee: Math.max(0, t.fee) }))
    : PRICING_DEFAULTS.escrowTiers;
  return {
    escrowTiers: tiers,
    loanRate: num(partial.loanRate, PRICING_DEFAULTS.loanRate),
    loanFeeMin: num(partial.loanFeeMin, PRICING_DEFAULTS.loanFeeMin),
    transferNormal: num(partial.transferNormal, PRICING_DEFAULTS.transferNormal),
    transferKei: num(partial.transferKei, PRICING_DEFAULTS.transferKei),
    warrantyBaseKei: num(partial.warrantyBaseKei, PRICING_DEFAULTS.warrantyBaseKei),
    warrantyBaseDomestic: num(partial.warrantyBaseDomestic, PRICING_DEFAULTS.warrantyBaseDomestic),
    warrantyBaseImport: num(partial.warrantyBaseImport, PRICING_DEFAULTS.warrantyBaseImport),
    warrantyAgeFreeYears: num(partial.warrantyAgeFreeYears, PRICING_DEFAULTS.warrantyAgeFreeYears),
    warrantyAgeStep: num(partial.warrantyAgeStep, PRICING_DEFAULTS.warrantyAgeStep),
    warrantyMileageFreeKm: num(partial.warrantyMileageFreeKm, PRICING_DEFAULTS.warrantyMileageFreeKm),
    warrantyMileageStep: num(partial.warrantyMileageStep, PRICING_DEFAULTS.warrantyMileageStep),
    warrantyCap: num(partial.warrantyCap, PRICING_DEFAULTS.warrantyCap),
  };
}
