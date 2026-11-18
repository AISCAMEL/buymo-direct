// 査定表の標準チェックリスト定義（現車検査の項目・評価スケール）。
// スマホ/iPad で素早くタップできるよう、各項目は4段階評価＋メモ＋写真。

export type RatingCode = 'good' | 'ok' | 'warn' | 'bad' | 'na';

export const RATINGS: { code: RatingCode; mark: string; label: string; tone: string }[] = [
  { code: 'good', mark: '◎', label: '良好', tone: 'emerald' },
  { code: 'ok', mark: '○', label: '普通', tone: 'sky' },
  { code: 'warn', mark: '△', label: '要注意', tone: 'amber' },
  { code: 'bad', mark: '×', label: '不良', tone: 'red' },
  { code: 'na', mark: '—', label: '対象外', tone: 'slate' },
];

export function ratingMeta(code?: string) {
  return RATINGS.find((r) => r.code === code);
}

export type InspItem = { key: string; label: string; hint?: string };
export type InspSection = { key: string; label: string; items: InspItem[] };

export const INSPECTION_SPEC: InspSection[] = [
  {
    key: 'exterior',
    label: '外装',
    items: [
      { key: 'front', label: 'フロント', hint: 'キズ・ヘコミ・塗装' },
      { key: 'rightSide', label: '右側面' },
      { key: 'leftSide', label: '左側面' },
      { key: 'rear', label: 'リア' },
      { key: 'roof', label: 'ルーフ' },
      { key: 'hood', label: 'ボンネット' },
      { key: 'bumperF', label: 'フロントバンパー' },
      { key: 'bumperR', label: 'リアバンパー' },
    ],
  },
  {
    key: 'glassLight',
    label: 'ガラス・灯火',
    items: [
      { key: 'windshield', label: 'フロントガラス', hint: '飛び石・ヒビ' },
      { key: 'otherGlass', label: 'その他ガラス' },
      { key: 'headlight', label: 'ヘッドライト', hint: 'くすみ・点灯' },
      { key: 'otherLights', label: 'その他灯火類' },
    ],
  },
  {
    key: 'interior',
    label: '内装',
    items: [
      { key: 'seats', label: 'シート', hint: '擦れ・破れ・シミ' },
      { key: 'dashboard', label: 'ダッシュ・内装パネル' },
      { key: 'ceiling', label: '天井' },
      { key: 'floor', label: 'フロア・マット' },
      { key: 'odor', label: 'におい', hint: 'タバコ・ペット' },
      { key: 'warningLamp', label: 'メーター警告灯', hint: '点灯有無' },
    ],
  },
  {
    key: 'engine',
    label: '機関',
    items: [
      { key: 'start', label: '始動性' },
      { key: 'idle', label: 'アイドリング・異音' },
      { key: 'oilLeak', label: 'オイル漏れ' },
      { key: 'coolant', label: '冷却水・漏れ' },
      { key: 'belt', label: 'ベルト類' },
      { key: 'battery', label: 'バッテリー' },
    ],
  },
  {
    key: 'drive',
    label: '走行・足回り',
    items: [
      { key: 'brake', label: 'ブレーキ効き' },
      { key: 'suspension', label: '足回り異音' },
      { key: 'steering', label: 'ハンドル・直進性' },
      { key: 'transmission', label: '変速(AT/MT)' },
    ],
  },
  {
    key: 'tires',
    label: 'タイヤ',
    items: [
      { key: 'tireFR', label: '右前', hint: '残溝(mm)をメモに' },
      { key: 'tireFL', label: '左前', hint: '残溝(mm)をメモに' },
      { key: 'tireRR', label: '右後', hint: '残溝(mm)をメモに' },
      { key: 'tireRL', label: '左後', hint: '残溝(mm)をメモに' },
      { key: 'spare', label: 'スペア・応急' },
    ],
  },
  {
    key: 'electrical',
    label: '電装・装備',
    items: [
      { key: 'ac', label: 'エアコン効き' },
      { key: 'nav', label: 'ナビ・オーディオ' },
      { key: 'windows', label: 'パワーウインドウ' },
      { key: 'powerEquip', label: '電動装備', hint: 'スライド・バックドア等' },
      { key: 'keyless', label: 'スマートキー' },
    ],
  },
  {
    key: 'underbody',
    label: '下回り・修復歴',
    items: [
      { key: 'rust', label: '錆・腐食' },
      { key: 'frame', label: '骨格・修復歴', hint: '有無と箇所をメモに' },
      { key: 'muffler', label: 'マフラー' },
    ],
  },
  {
    key: 'docs',
    label: '書類・付属品',
    items: [
      { key: 'shakensho', label: '車検証' },
      { key: 'recordBook', label: '整備記録簿' },
      { key: 'spareKey', label: 'スペアキー' },
      { key: 'manual', label: '取説・保証書' },
    ],
  },
];

export const ALL_ITEM_COUNT = INSPECTION_SPEC.reduce((n, s) => n + s.items.length, 0);

export const OVERALL_GRADES: { code: string; label: string }[] = [
  { code: 'S', label: 'S（極上）' },
  { code: 'A', label: 'A（良車）' },
  { code: 'B', label: 'B（標準）' },
  { code: 'C', label: 'C（要整備）' },
  { code: 'D', label: 'D（訳あり）' },
];

export type InspectionData = Record<string, { rating?: RatingCode; note?: string; photos?: string[] }>;

/** 入力済み項目数（評価が付いた項目）。 */
export function ratedCount(data: InspectionData | undefined): number {
  if (!data) return 0;
  return Object.values(data).filter((v) => v && v.rating).length;
}

/** 評価の分布から総合グレードを提案（スタッフは上書き可能）。 */
export function suggestOverall(data: InspectionData | undefined): string {
  if (!data) return 'B';
  let bad = 0, warn = 0, good = 0, rated = 0;
  for (const v of Object.values(data)) {
    if (!v?.rating || v.rating === 'na') continue;
    rated++;
    if (v.rating === 'bad') bad++;
    else if (v.rating === 'warn') warn++;
    else if (v.rating === 'good') good++;
  }
  if (rated === 0) return 'B';
  if (bad >= 3) return 'D';
  if (bad >= 1 || warn >= 5) return 'C';
  if (good / rated >= 0.85 && warn === 0) return 'S';
  if (good / rated >= 0.6) return 'A';
  return 'B';
}
