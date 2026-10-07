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
  // 保証の全体調整（％）。PDF料金表の税込価格に対して加算/割引。正=上乗せ, 負=割引。0=そのまま。
  warrantyAdjustPercent: number;
  // マッチング手数料（加盟店→本部の成果報酬）。料率はサービスカテゴリー単位。
  matchingFeeRateByCategory: Record<string, number>; // 例 {'整備・修理':0.10}
  matchingFeeDefaultRate: number;                     // 個別未設定時の既定料率（例 0.10）
  matchingFeeMinFee: number;                          // 最低手数料（税抜, 例 1100）
  matchingFeeTaxRate: number;                         // 消費税率（例 0.10）
  // 消費税マスター（見積・請求で使用。将来変更可能）
  consumptionTaxRate: number;                         // 標準税率（例 0.10）
  // 手数料の締め請求
  billingClosingDay: number;                          // 締め日（0=末日, 1〜28=その日）
  billingDueDays: number;                             // 締め後の支払期限（日数, 例 14）
  // 有料会員
  membershipMonthlyFee: number;                       // 有料会員 月額（税込, 例 33000）
  // 買取加盟（フランチャイズ）
  joiningFee: number;                                 // 買取加盟金（請求, 例 550000）
  // カード決済（Square）の手数料上乗せ率。提示額に加算して請求（例 0.036 = 3.6%）
  squareSurchargeRate: number;
  // オークション
  auctionListingFee: number;                          // オークション出品料（1台, 例 10000）
  dealCommissionRate: number;                          // 成約手数料率＝利益に対して（例 0.03 = 3%）。オークション決算書で算出。
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
  warrantyAdjustPercent: 0,
  // ※ 料率はあくまで初期の目安。本部で調整可能（法務確認のうえ確定してください）。
  matchingFeeRateByCategory: {
    '査定・買取': 0.03,
    '整備・修理': 0.10,
    '美装': 0.10,
    '電装・取付': 0.10,
    '物流・手続き': 0.08,
    'レンタカー・リース': 0.10,
    'その他': 0.10,
  },
  matchingFeeDefaultRate: 0.10,
  matchingFeeMinFee: 1100,
  matchingFeeTaxRate: 0.10,
  consumptionTaxRate: 0.10,
  billingClosingDay: 0,
  billingDueDays: 14,
  membershipMonthlyFee: 33000,
  joiningFee: 550000,
  squareSurchargeRate: 0.036,
  auctionListingFee: 10000,
  dealCommissionRate: 0.03,
};

/** 保証の税込価格に本部調整（％）を適用。 */
export function applyWarrantyAdjust(taxInclFee: number, adjustPercent?: number): number {
  const pct = typeof adjustPercent === 'number' && Number.isFinite(adjustPercent) ? adjustPercent : 0;
  if (!pct) return taxInclFee;
  return Math.max(0, Math.round(taxInclFee * (1 + pct / 100)));
}

// 期間係数は固定（6/12/24ヶ月）。
export const WARRANTY_PERIOD_FACTOR: Record<number, number> = { 6: 1.0, 12: 1.7, 24: 2.4 };
export const WARRANTY_MONTHS = [6, 12, 24] as const;

/** DB等から来た部分的な設定をデフォルトにマージ（数値のみ・不正値は無視）。 */
export function mergePricingConfig(partial?: Partial<PricingConfig> | null): PricingConfig {
  if (!partial || typeof partial !== 'object') return PRICING_DEFAULTS;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  // 符号あり（割引でマイナス可）。-100〜1000% に制限。
  const signed = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= -100 && v <= 1000 ? v : d);
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
    warrantyAdjustPercent: signed(partial.warrantyAdjustPercent, PRICING_DEFAULTS.warrantyAdjustPercent),
    matchingFeeRateByCategory: mergeRateMap(partial.matchingFeeRateByCategory),
    matchingFeeDefaultRate: rate(partial.matchingFeeDefaultRate, PRICING_DEFAULTS.matchingFeeDefaultRate),
    matchingFeeMinFee: num(partial.matchingFeeMinFee, PRICING_DEFAULTS.matchingFeeMinFee),
    matchingFeeTaxRate: rate(partial.matchingFeeTaxRate, PRICING_DEFAULTS.matchingFeeTaxRate),
    consumptionTaxRate: rate(partial.consumptionTaxRate, PRICING_DEFAULTS.consumptionTaxRate),
    billingClosingDay: num(partial.billingClosingDay, PRICING_DEFAULTS.billingClosingDay),
    billingDueDays: num(partial.billingDueDays, PRICING_DEFAULTS.billingDueDays),
    membershipMonthlyFee: num(partial.membershipMonthlyFee, PRICING_DEFAULTS.membershipMonthlyFee),
    joiningFee: num(partial.joiningFee, PRICING_DEFAULTS.joiningFee),
    squareSurchargeRate: rate(partial.squareSurchargeRate, PRICING_DEFAULTS.squareSurchargeRate),
    auctionListingFee: num(partial.auctionListingFee, PRICING_DEFAULTS.auctionListingFee),
    dealCommissionRate: rate(partial.dealCommissionRate, PRICING_DEFAULTS.dealCommissionRate),
  };
}

/** 料率（0〜1）。範囲外・不正は既定値。 */
function rate(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : d;
}

/** カテゴリー別料率マップをデフォルトにマージ（0〜1 の数値のみ採用）。 */
function mergeRateMap(partial: unknown): Record<string, number> {
  const base = { ...PRICING_DEFAULTS.matchingFeeRateByCategory };
  if (partial && typeof partial === 'object') {
    for (const [k, v] of Object.entries(partial as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) base[k] = v;
    }
  }
  return base;
}
