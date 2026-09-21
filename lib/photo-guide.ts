// 出品・査定で使う撮影ガイド（推奨アングル）

// 出品用（公開される写真）
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

// 査定用（より詳しく確認するため枚数を増やす）。private=true は出品には引き継がない（個人情報等）。
export const APPRAISAL_PHOTO_GUIDE: { label: string; hint: string; private?: boolean }[] = [
  { label: 'フロント（正面）', hint: '車の正面全体' },
  { label: 'リア（背面）', hint: '車の後ろ全体' },
  { label: '左サイド', hint: '左横から全体' },
  { label: '右サイド', hint: '右横から全体' },
  { label: '斜め前（左前）', hint: '前と横が入るように' },
  { label: '斜め後ろ（右後）', hint: '後ろと横が入るように' },
  { label: '室内（前席）', hint: '運転席まわり' },
  { label: '室内（後席）', hint: '後部座席' },
  { label: 'メーター', hint: '走行距離が写るように' },
  { label: 'ダッシュボード（警告灯）', hint: 'エンジン始動時。警告灯が出ていれば必ず' },
  { label: 'エンジンルーム', hint: 'ボンネットを開けて' },
  { label: 'トランク・荷室', hint: '荷室内の状態' },
  { label: 'タイヤ・ホイール', hint: '溝の残り・キズ' },
  { label: '下回り', hint: '可能な範囲で車の下' },
  { label: '傷・へこみ①', hint: '気になる箇所を近くで' },
  { label: '傷・へこみ②', hint: '別の箇所があれば' },
  { label: '車検証', hint: '型式・車台番号の確認用（※出品には使いません）', private: true },
];

export const APPRAISAL_LABELS = APPRAISAL_PHOTO_GUIDE.map((g) => g.label);

/** 査定ガイド順のソート用インデックス。ガイド外は 100。 */
export function appraisalGuideIndex(caption?: string | null): number {
  const i = caption ? APPRAISAL_LABELS.indexOf(caption) : -1;
  return i < 0 ? 100 : i;
}

/** 出品に引き継がない写真のキャプション（車検証など個人情報を含むもの）。 */
export const PRIVATE_CAPTIONS = new Set(
  APPRAISAL_PHOTO_GUIDE.filter((g) => g.private).map((g) => g.label),
);
