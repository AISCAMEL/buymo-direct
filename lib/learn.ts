// 学習コンテンツ「買取を学ぶ」の共通定義。

export const LEARN_CATEGORY_LABEL: Record<string, string> = {
  basics: '基礎',
  appraisal: '査定',
  pricing: '相場',
  sourcing: '仕入れ',
  legal: '法令',
  sales: '販売',
};

export const LEARN_CATEGORY_CLS: Record<string, string> = {
  basics: 'bg-slate-100 text-slate-600',
  appraisal: 'bg-blue-100 text-blue-700',
  pricing: 'bg-emerald-100 text-emerald-700',
  sourcing: 'bg-amber-100 text-amber-700',
  legal: 'bg-purple-100 text-purple-700',
  sales: 'bg-navy-100 text-navy-700',
};

export type LearningContent = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: string | null;
  is_premium: boolean;
  published: boolean;
  sort: number;
};
