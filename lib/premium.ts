// 有料会員コンテンツのカテゴリー定義（副作用なし）。

export const PREMIUM_CATEGORY_LABEL: Record<string, string> = {
  market: '相場',
  sourcing: '仕入れ',
  doc: '資料',
  video: '動画',
};

export const PREMIUM_CATEGORY_CLS: Record<string, string> = {
  market: 'bg-teal-100 text-teal-700',
  sourcing: 'bg-gold-100 text-gold-700',
  doc: 'bg-navy-100 text-navy-700',
  video: 'bg-rose-100 text-rose-700',
};

export const PREMIUM_CATEGORIES = [
  { value: 'market', label: '相場' },
  { value: 'sourcing', label: '仕入れ' },
  { value: 'doc', label: '資料' },
  { value: 'video', label: '動画' },
];

export type PremiumResource = {
  id: string;
  category: string;
  title: string;
  summary: string | null;
  body: string | null;
  url: string | null;
  published: boolean;
  sort: number;
};
