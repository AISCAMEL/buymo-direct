// パーツ・用品のヤフオク形式オークションの共通定義。副作用なし（クライアント/サーバー両用）。

export type PartCategory = 'wheel' | 'tire' | 'nav' | 'aero' | 'audio' | 'exterior' | 'interior' | 'other';
export type ItemCondition = 'new' | 'used';
export type AuctionStatus = 'active' | 'ended' | 'sold' | 'cancelled';

export const PART_CATEGORY_LABEL: Record<PartCategory, string> = {
  wheel: 'アルミホイール',
  tire: 'タイヤ',
  nav: 'カーナビ・電装',
  aero: 'エアロ・外装',
  audio: 'オーディオ',
  exterior: '外装パーツ',
  interior: '内装パーツ',
  other: 'その他',
};

export const CONDITION_LABEL: Record<ItemCondition, string> = { new: '新品', used: '中古' };

export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  active: '開催中',
  ended: '終了',
  sold: '落札',
  cancelled: '取消',
};
export const AUCTION_STATUS_CLS: Record<AuctionStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  ended: 'bg-slate-100 text-slate-500',
  sold: 'bg-gold-100 text-gold-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const DURATION_OPTIONS = [
  { value: 1, label: '1日' },
  { value: 3, label: '3日' },
  { value: 5, label: '5日' },
  { value: 7, label: '7日' },
];

/** ヤフオク準拠の入札単位（現在価格に応じて増額幅が変わる）。 */
export function bidIncrement(current: number): number {
  if (current < 1000) return 10;
  if (current < 5000) return 100;
  if (current < 10000) return 250;
  if (current < 50000) return 500;
  if (current < 100000) return 1000;
  return 5000;
}

/**
 * 次に入札できる最低額。
 * まだ入札が無ければ開始価格そのもの、入札があれば現在価格＋入札単位。
 */
export function minNextBid(currentPrice: number, bidCount: number, startPrice: number): number {
  if (bidCount <= 0) return Math.max(0, startPrice);
  return currentPrice + bidIncrement(currentPrice);
}

export interface PartAuction {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: PartCategory;
  item_condition: ItemCondition;
  images: string[];
  start_price: number;
  buy_now_price: number | null;
  current_price: number;
  bid_count: number;
  highest_bidder_id: string | null;
  ends_at: string;
  status: AuctionStatus;
  winner_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
}

/** 残り時間の表示（終了済みなら「終了」）。 */
export function timeLeftLabel(endsAtIso: string, now: number = Date.now()): string {
  const diff = new Date(endsAtIso).getTime() - now;
  if (diff <= 0) return '終了';
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `残り ${d}日${h}時間`;
  if (h > 0) return `残り ${h}時間${m}分`;
  return `残り ${m}分`;
}

export function isEnded(a: { ends_at: string; status: AuctionStatus }, now: number = Date.now()): boolean {
  return a.status !== 'active' || new Date(a.ends_at).getTime() <= now;
}
