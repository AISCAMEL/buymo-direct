// ローン返済シミュレーション（元利均等返済）

export const LOAN_TERMS = [12, 24, 36, 48, 60, 72]; // 支払回数（月）

/** 元利均等の毎月返済額（円・四捨五入）。M = P·r / (1 − (1+r)^−n) */
export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  if (months <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return Math.round(principal / months);
  const m = (principal * r) / (1 - Math.pow(1 + r, -months));
  return Math.round(m);
}

export interface LoanPlan {
  months: number;
  monthly: number;
  total: number;     // 総支払額
  interest: number;  // うち金利
}

export function loanPlan(principal: number, aprPercent: number, months: number): LoanPlan {
  const monthly = monthlyPayment(principal, aprPercent, months);
  const total = monthly * months;
  return { months, monthly, total, interest: Math.max(0, total - principal) };
}

// --- 頭金・ボーナス併用対応のシミュレーション -------------------------------

export interface LoanInput {
  price: number;           // 現金価格（融資前）
  downPayment: number;     // 頭金
  bonusPrincipal: number;  // ボーナス加算に充てる元金
  aprPercent: number;      // 年率
  months: number;          // 支払回数（月）
}

export interface LoanResult {
  financed: number;    // 融資額（price − 頭金）
  monthly: number;     // 毎月の返済額
  bonus: number;       // ボーナス月の加算額（1回あたり）
  bonusCount: number;  // ボーナス払い回数（半年ごと）
  total: number;       // 総支払額（頭金除く）
  interest: number;    // うち金利
}

/** 半年複利での元利均等（ボーナス払い用）。 */
function semiAnnualPayment(principal: number, aprPercent: number, count: number): number {
  if (count <= 0 || principal <= 0) return 0;
  const r = aprPercent / 100 / 2;
  if (r === 0) return Math.round(principal / count);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -count)));
}

export function simulateLoan(input: LoanInput): LoanResult {
  const { price, aprPercent, months } = input;
  const downPayment = Math.max(0, Math.min(input.downPayment, price));
  const financed = Math.max(0, price - downPayment);
  const bonusCount = Math.floor(months / 6);

  // ボーナス元金は融資額の範囲内。ボーナス回数0なら月々に寄せる
  let bonusPrincipal = Math.max(0, Math.min(input.bonusPrincipal, financed));
  if (bonusCount === 0) bonusPrincipal = 0;
  const monthlyPrincipal = financed - bonusPrincipal;

  const monthly = monthlyPayment(monthlyPrincipal, aprPercent, months);
  const bonus = semiAnnualPayment(bonusPrincipal, aprPercent, bonusCount);
  const total = monthly * months + bonus * bonusCount;

  return { financed, monthly, bonus, bonusCount, total, interest: Math.max(0, total - financed) };
}
