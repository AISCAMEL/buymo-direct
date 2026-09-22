import { monthlyPayment } from '@/lib/loan';

// ── 買い手手数料（エスクロー・取引手数料）：定額制 ──────────────────────────
export function escrowFee(price: number): number {
  if (price <= 0) return 0;
  if (price < 1_000_000) return 19800;
  if (price < 2_000_000) return 39800;
  if (price < 4_000_000) return 59800;
  return 79800;
}

// ── ローン手数料：借入元金の3.6%（下限¥11,000・上限なし）──────────────────
export const LOAN_FEE_RATE = 0.036;
export const LOAN_FEE_MIN = 11000;
export function loanFee(principal: number): number {
  if (principal <= 0) return LOAN_FEE_MIN;
  return Math.max(LOAN_FEE_MIN, Math.round(principal * LOAN_FEE_RATE));
}

// ── オプション（OP）価格 ────────────────────────────────────────────────
export const OPTION_PRICES = {
  transferNormal: 19800, // 名義変更代行（普通車・車庫証明込み）
  transferKei: 13200,    // 名義変更代行（軽自動車）
  garage: 11000,         // 車庫証明代行のみ
};

// ── 売り手手数料（受取額から差引：既存の fee_rate％）────────────────────
export function sellerFee(price: number, feeRatePercent: number): number {
  return Math.round(Math.max(0, price) * Math.max(0, feeRatePercent) / 100);
}

// ── 買い手の見積り一式（ローン購入時：エスクロー＋ローン手数料＋OP）────────
export interface QuoteInput {
  price: number;         // 車両価格
  downPayment: number;   // 頭金
  optionsTotal: number;  // 選択したOPの合計（保証・名義変更・車庫証明・陸送 等）
  useLoan: boolean;      // ローン利用（trueでローン手数料を加算）
  aprPercent: number;    // 年率
  months: number;        // 支払回数
}
export interface Quote {
  price: number;
  escrow: number;
  optionsTotal: number;
  principalBeforeLoanFee: number; // 車両＋エスクロー＋OP−頭金
  loanFee: number;                // ローン利用時のみ >0
  financed: number;               // 融資額（＝principal＋loanFee）
  grandTotal: number;             // お支払い総額（頭金前）＝車両＋エスクロー＋OP＋ローン手数料
  monthly: number;                // 月々（ローン利用時）
}

export function computeQuote(input: QuoteInput): Quote {
  const price = Math.max(0, input.price);
  const escrow = escrowFee(price);
  const optionsTotal = Math.max(0, input.optionsTotal);
  const down = Math.max(0, Math.min(input.downPayment, price + escrow + optionsTotal));
  const principalBeforeLoanFee = Math.max(0, price + escrow + optionsTotal - down);
  const lf = input.useLoan ? loanFee(principalBeforeLoanFee) : 0;
  const financed = principalBeforeLoanFee + lf;
  const grandTotal = price + escrow + optionsTotal + lf;
  const monthly = input.useLoan ? monthlyPayment(financed, input.aprPercent, input.months) : 0;
  return { price, escrow, optionsTotal, principalBeforeLoanFee, loanFee: lf, financed, grandTotal, monthly };
}
