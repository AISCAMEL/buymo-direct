// 走行距離：1万km範囲で50万kmまで（値は代表値の km）。査定・AI査定で共用。
export const MILEAGE_OPTIONS: { value: number; label: string }[] = [
  { value: 5000, label: '1万km未満' },
  ...Array.from({ length: 49 }, (_, i) => ({ value: (i + 1) * 10000 + 5000, label: `${i + 1}〜${i + 2}万km` })),
  { value: 505000, label: '50万km以上' },
];

/** 任意の km を最寄りの選択肢の代表値に丸める。0/未入力は 0（＝未選択）。 */
export function mileageToOption(km: number): number {
  if (!km || km <= 0) return 0;
  if (km < 10000) return 5000;
  if (km >= 500000) return 505000;
  const i = Math.floor(km / 10000);
  return i * 10000 + 5000;
}
