// 出品者の種別（ユーザー／販売店／代行）を判定・表示するための共通定義。

export type SellerKind = 'user' | 'dealer' | 'proxy';

/** dealer_id があれば販売店、listing_type='proxy' なら代行、それ以外はユーザー。 */
export function sellerKind(l: { dealer_id?: string | null; listing_type?: string | null }): SellerKind {
  if (l.dealer_id) return 'dealer';
  if (l.listing_type === 'proxy') return 'proxy';
  return 'user';
}

export const SELLER_KIND_LABEL: Record<SellerKind, string> = {
  user: 'ユーザー',
  dealer: '販売店',
  proxy: '代行',
};

export const SELLER_KIND_CLS: Record<SellerKind, string> = {
  user: 'bg-emerald-500 text-white',
  dealer: 'bg-navy-500 text-white',
  proxy: 'bg-purple-500 text-white',
};

/** 補足説明（詳細ページ用）。 */
export const SELLER_KIND_NOTE: Record<SellerKind, string> = {
  user: '個人のオーナーが出品しています。',
  dealer: '加盟の販売店が出品しています。',
  proxy: 'BUYMOが売主に代わって出品・販売しています。',
};
