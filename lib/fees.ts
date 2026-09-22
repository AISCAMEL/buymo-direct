import { monthlyPayment } from '@/lib/loan';
import { PRICING_DEFAULTS, type PricingConfig } from '@/lib/pricing-config';

// ── 買い手手数料（エスクロー・取引手数料）：定額制 ──────────────────────────
export function escrowFee(price: number, cfg: PricingConfig = PRICING_DEFAULTS): number {
  if (price <= 0) return 0;
  for (const t of cfg.escrowTiers) {
    if (t.max === null || price < t.max) return t.fee;
  }
  return cfg.escrowTiers[cfg.escrowTiers.length - 1]?.fee ?? 0;
}

// ── ローン手数料：借入元金 × loanRate（下限 loanFeeMin・上限なし）───────────
export function loanFee(principal: number, cfg: PricingConfig = PRICING_DEFAULTS): number {
  if (principal <= 0) return cfg.loanFeeMin;
  return Math.max(cfg.loanFeeMin, Math.round(principal * cfg.loanRate));
}

// ── 名義変更代行 ───────────────────────────────────────────────────────
export function transferFee(isKei: boolean, cfg: PricingConfig = PRICING_DEFAULTS): number {
  return isKei ? cfg.transferKei : cfg.transferNormal;
}

// 旧APIとの互換（既存 import 用）
export const OPTION_PRICES = {
  transferNormal: PRICING_DEFAULTS.transferNormal,
  transferKei: PRICING_DEFAULTS.transferKei,
  garage: 11000,
};

// ── 売り手手数料（受取額から差引：既存の fee_rate％）────────────────────
export function sellerFee(price: number, feeRatePercent: number): number {
  return Math.round(Math.max(0, price) * Math.max(0, feeRatePercent) / 100);
}

// ── 買い手の見積り一式 ──────────────────────────────────────────────────
export interface QuoteInput {
  price: number;
  downPayment: number;
  optionsTotal: number;
  useLoan: boolean;
  aprPercent: number;
  months: number;
}
export interface Quote {
  price: number;
  escrow: number;
  optionsTotal: number;
  principalBeforeLoanFee: number;
  loanFee: number;
  financed: number;
  grandTotal: number;
  monthly: number;
}

export function computeQuote(input: QuoteInput, cfg: PricingConfig = PRICING_DEFAULTS): Quote {
  const price = Math.max(0, input.price);
  const escrow = escrowFee(price, cfg);
  const optionsTotal = Math.max(0, input.optionsTotal);
  const down = Math.max(0, Math.min(input.downPayment, price + escrow + optionsTotal));
  const principalBeforeLoanFee = Math.max(0, price + escrow + optionsTotal - down);
  const lf = input.useLoan ? loanFee(principalBeforeLoanFee, cfg) : 0;
  const financed = principalBeforeLoanFee + lf;
  const grandTotal = price + escrow + optionsTotal + lf;
  const monthly = input.useLoan ? monthlyPayment(financed, input.aprPercent, input.months) : 0;
  return { price, escrow, optionsTotal, principalBeforeLoanFee, loanFee: lf, financed, grandTotal, monthly };
}
