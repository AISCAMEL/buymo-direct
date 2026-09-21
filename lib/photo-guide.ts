// 出品・査定で共用する撮影ガイド（推奨アングル）
export const PHOTO_GUIDE: { label: string; hint: string }[] = [
  { label: 'フロント（正面）', hint: '車の正面全体' },
  { label: 'リア（背面）', hint: '車の後ろ全体' },
  { label: '左サイド', hint: '左横から全体' },
  { label: '右サイド', hint: '右横から全体' },
  { label: '室内（前席）', hint: '運転席まわり' },
  { label: '室内（後席）', hint: '後部座席' },
  { label: 'メーター', hint: '走行距離が写るように' },
  { label: 'エンジンルーム', hint: 'ボンネットを開けて' },
  { label: '傷・気になる箇所', hint: 'あれば近くで' },
];

export const GUIDE_LABELS = PHOTO_GUIDE.map((g) => g.label);

/** ガイド順（フロント→…→その他）のソート用インデックス。ガイド外は 100。 */
export function guideIndex(caption?: string | null): number {
  const i = caption ? GUIDE_LABELS.indexOf(caption) : -1;
  return i < 0 ? 100 : i;
}
