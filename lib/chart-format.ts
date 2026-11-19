// グラフの値フォーマット。関数をServer→Client Componentへ渡せない制約があるため、
// 「関数」ではなく「シリアライズ可能な文字列(format)」を渡し、描画側で関数に解決する。

export type ChartFormat = 'number' | 'yenShort' | 'mei';

/** 金額を短縮表示（¥1.2億 / ¥340万 / ¥5,000）。 */
export function formatYenShort(v: number): string {
  if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

/** format指定に応じて値を整形（グラフ内部で使用）。 */
export function formatChartValue(v: number, format: ChartFormat = 'number'): string {
  switch (format) {
    case 'yenShort':
      return formatYenShort(v);
    case 'mei':
      return `${v.toLocaleString('ja-JP')}名`;
    default:
      return v.toLocaleString('ja-JP');
  }
}
