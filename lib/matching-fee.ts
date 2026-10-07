// マッチング手数料（加盟店 → 本部の成果報酬）の計算。
// サービス種別（スキル）ごとに料率を変え、案件成立時に手数料を算出する。
// 副作用なしのプレーン定義（クライアント/サーバー両方から import 可）。

import type { PricingConfig } from '@/lib/pricing-config';

/** スキルキー → サービスカテゴリー。料率はカテゴリー単位で管理する。 */
export const SKILL_CATEGORY: Record<string, string> = {
  appraisal: '査定・買取', buyback: '査定・買取', sales: '査定・買取',
  maintenance: '整備・修理', inspection: '整備・修理', bodywork: '整備・修理',
  painting: '整備・修理', tire: '整備・修理',
  coating: '美装', cleaning: '美装', wrapping: '美装',
  nav_install: '電装・取付', drive_recorder: '電装・取付', electrical: '電装・取付',
  transport: '物流・手続き', delivery: '物流・手続き', registration: '物流・手続き',
  scrap: '物流・手続き', dismantle: '物流・手続き', roadservice: '物流・手続き',
  rental: 'レンタカー・リース', lease: 'レンタカー・リース', subscription: 'レンタカー・リース',
  other: 'その他',
};

export function skillCategory(skillKey: string): string {
  return SKILL_CATEGORY[skillKey] ?? 'その他';
}

export interface MatchingFeeBreakdown {
  category: string;   // 適用カテゴリー
  rate: number;       // 適用料率（0.10 = 10%）
  base: number;       // 対象金額（成約金額・税抜想定）
  feeExclTax: number; // 手数料（税抜）
  tax: number;        // 消費税
  total: number;      // 請求総額（税込）
  minApplied: boolean;// 最低手数料が適用されたか
}

/**
 * マッチング手数料を算出。
 * base（成約金額）× カテゴリー料率、下限は minFee。税は total に加算。
 */
export function computeMatchingFee(
  skillKey: string,
  base: number,
  cfg: PricingConfig
): MatchingFeeBreakdown {
  const category = skillCategory(skillKey);
  const rate = matchingRate(category, cfg);
  const amount = Number.isFinite(base) && base > 0 ? Math.round(base) : 0;

  const raw = Math.round(amount * rate);
  const minFee = Math.max(0, cfg.matchingFeeMinFee ?? 0);
  const feeExclTax = amount > 0 ? Math.max(raw, minFee) : 0;
  const minApplied = amount > 0 && feeExclTax > raw;

  const taxRate = cfg.matchingFeeTaxRate ?? 0.1;
  const tax = Math.round(feeExclTax * taxRate);
  return { category, rate, base: amount, feeExclTax, tax, total: feeExclTax + tax, minApplied };
}

/** カテゴリーの適用料率（個別設定 → デフォルト料率）。 */
export function matchingRate(category: string, cfg: PricingConfig): number {
  const byCat = cfg.matchingFeeRateByCategory ?? {};
  const r = byCat[category];
  if (typeof r === 'number' && Number.isFinite(r) && r >= 0) return r;
  return cfg.matchingFeeDefaultRate ?? 0.1;
}

/** 請求ステータスの表示。 */
export type ChargeStatus = 'pending' | 'invoiced' | 'paid' | 'waived' | 'cancelled';
export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  pending: '未請求', invoiced: '請求済み', paid: '入金済み', waived: '免除', cancelled: '取消',
};
export const CHARGE_STATUS_CLS: Record<ChargeStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  invoiced: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  waived: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-400',
};
