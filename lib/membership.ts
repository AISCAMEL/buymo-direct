// 会員種別とプレミアム表示の判定。

export type MemberTier = 'free' | 'paid';

export const MEMBER_TIER_LABEL: Record<MemberTier, string> = {
  free: '無料会員',
  paid: '有料会員',
};

/** プレミアム領域を閲覧できるか（有料会員・加盟店・本部は解放）。 */
export function canSeePremium(opts: { tier?: string | null; isDealer?: boolean; isAdmin?: boolean }): boolean {
  return opts.tier === 'paid' || !!opts.isDealer || !!opts.isAdmin;
}

export const LEAD_WISH_LABEL: Record<string, string> = {
  pro: 'プロとしてスキル提供（無料）',
  sole_proprietor: '個人事業主として加盟店希望',
  corporation: '法人として加盟店希望',
  undecided: 'まずは相談したい',
};

export const LEAD_STATUS_LABEL: Record<string, string> = {
  new: '新規', contacted: '連絡済み', converted: '加盟', closed: '見送り',
};
export const LEAD_STATUS_CLS: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  converted: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};
