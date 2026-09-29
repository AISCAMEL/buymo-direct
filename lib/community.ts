// 買取コミュニティの共通定義。

export const COMMUNITY_CATEGORY_LABEL: Record<string, string> = {
  question: '質問',
  beginner: '初心者質問',
  success: '成功事例',
  consult: '相談',
  official: '運営から',
};
export const COMMUNITY_CATEGORY_CLS: Record<string, string> = {
  question: 'bg-blue-100 text-blue-700',
  beginner: 'bg-emerald-100 text-emerald-700',
  success: 'bg-gold-100 text-gold-600',
  consult: 'bg-purple-100 text-purple-700',
  official: 'bg-navy-100 text-navy-700',
};

/** 投稿フォーム用の選択肢（運営専用カテゴリーは除外）。 */
export const COMMUNITY_POST_CATEGORIES: { value: string; label: string }[] = [
  { value: 'beginner', label: '初心者質問' },
  { value: 'question', label: '質問' },
  { value: 'consult', label: '相談' },
  { value: 'success', label: '成功事例' },
];
