// 査定の「かんたん問診」設定（ユーザーはボタンで選択、本部は結果をラベルで確認）

export type DiagOption = { value: string; label: string; warn?: boolean };
export type DiagQuestion = { key: string; q: string; help?: string; options: DiagOption[] };

export const DIAGNOSIS_QUESTIONS: DiagQuestion[] = [
  {
    key: 'accident',
    q: '事故歴（過去に事故にあったか）',
    help: 'ぶつけた・ぶつけられた経験があれば「ある」を選択',
    options: [
      { value: 'none', label: 'ない' },
      { value: 'yes', label: 'ある', warn: true },
      { value: 'unknown', label: 'わからない' },
    ],
  },
  {
    key: 'flood',
    q: '冠水・水没歴',
    help: '大雨や災害で水に浸かったことがあるか',
    options: [
      { value: 'none', label: 'ない' },
      { value: 'yes', label: 'ある', warn: true },
      { value: 'unknown', label: 'わからない' },
    ],
  },
  {
    key: 'dent',
    q: 'へこみ・大きなキズ',
    options: [
      { value: 'none', label: 'ない' },
      { value: 'minor', label: '少しある' },
      { value: 'many', label: '目立つ', warn: true },
    ],
  },
  {
    key: 'interior',
    q: '内装の状態',
    options: [
      { value: 'clean', label: 'きれい' },
      { value: 'normal', label: '普通' },
      { value: 'dirty', label: '汚れ・傷あり', warn: true },
    ],
  },
  {
    key: 'odor',
    q: 'ニオイ（タバコ・ペット）',
    options: [
      { value: 'none', label: 'なし' },
      { value: 'slight', label: '少し' },
      { value: 'strong', label: 'あり', warn: true },
    ],
  },
  {
    key: 'engine',
    q: '走行・エンジンの調子',
    options: [
      { value: 'ok', label: '問題なし' },
      { value: 'warning', label: '警告灯あり', warn: true },
      { value: 'broken', label: '不動・要修理', warn: true },
    ],
  },
  {
    key: 'tire',
    q: 'タイヤの残り',
    options: [
      { value: 'enough', label: '十分' },
      { value: 'half', label: '半分ほど' },
      { value: 'low', label: '少ない', warn: true },
    ],
  },
  {
    key: 'modified',
    q: '改造・社外パーツ',
    options: [
      { value: 'none', label: 'なし（純正）' },
      { value: 'yes', label: 'あり' },
    ],
  },
];

export const SELL_TIMING_OPTIONS: DiagOption[] = [
  { value: 'immediately', label: '今すぐ売りたい' },
  { value: '1month', label: '1ヶ月以内' },
  { value: '3months', label: '3ヶ月以内' },
  { value: 'considering', label: 'まだ検討中' },
];

/** 保存された問診キー・値を日本語ラベルへ。本部表示用。 */
export function diagnosisLabel(key: string, value: string): { q: string; label: string; warn: boolean } | null {
  const q = DIAGNOSIS_QUESTIONS.find((x) => x.key === key);
  if (!q) return null;
  const o = q.options.find((x) => x.value === value);
  if (!o) return null;
  return { q: q.q, label: o.label, warn: !!o.warn };
}

export function sellTimingLabel(value?: string | null): string | null {
  return SELL_TIMING_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
