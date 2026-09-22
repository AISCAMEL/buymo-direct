// 保証料の自動計算（年式・走行距離・車種区分・期間で変動）

export const WARRANTY_MONTHS = [6, 12, 24] as const;
const PERIOD_FACTOR: Record<number, number> = { 6: 1.0, 12: 1.7, 24: 2.4 };

// 輸入車ブランド（保証基本料が高め）
const IMPORT_MAKERS = new Set([
  'BMW', 'メルセデス・ベンツ', 'アウディ', 'フォルクスワーゲン', 'ボルボ', 'MINI', 'プジョー',
  'ルノー', 'フィアット', 'アバルト', 'ジープ', 'ポルシェ', 'テスラ', 'シトロエン',
  'アルファロメオ', 'ジャガー', 'ランドローバー', '輸入車（その他）',
]);

/** 6ヶ月の基本料。軽=¥12,000／国産普通車=¥18,000／輸入車=¥40,000 */
export function warrantyBase(maker?: string | null, bodyType?: string | null): number {
  if (bodyType && bodyType.includes('軽')) return 12000;
  if (maker && IMPORT_MAKERS.has(maker)) return 40000;
  return 18000;
}

/**
 * 保証料 = 基本料 × 年式係数 × 走行距離係数 × 期間係数（1,000円丸め・上限¥150,000）
 *  年式係数: 3年落ちまで1.0、以降1年ごと+8%
 *  走行距離係数: 5万kmまで1.0、以降1万kmごと+5%
 */
export function estimateWarranty(opts: {
  year?: number | null;
  mileageKm?: number | null;
  maker?: string | null;
  bodyType?: string | null;
  months: number;
}): number | null {
  const pf = PERIOD_FACTOR[opts.months];
  if (!pf) return null;
  const base = warrantyBase(opts.maker, opts.bodyType);
  const now = new Date().getFullYear();
  const age = opts.year ? Math.max(0, now - opts.year) : 0;
  const ageFactor = 1 + Math.max(0, age - 3) * 0.08;
  const km = opts.mileageKm ?? 0;
  const mileageFactor = 1 + Math.max(0, (km - 50000) / 10000) * 0.05;
  const raw = base * ageFactor * mileageFactor * pf;
  return Math.round(Math.min(raw, 150000) / 1000) * 1000;
}
