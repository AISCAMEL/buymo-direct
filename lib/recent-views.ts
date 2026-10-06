// 最近見た車（閲覧履歴）— 端末内 localStorage に保存（個人情報は含めない）

export type RecentView = {
  id: string;
  title: string;
  price: number;
  cover?: string | null;
  maker?: string | null;
  model?: string | null;
};

const KEY = 'buymo-recent-views-v1';
const MAX = 12;

export function getRecentViews(): RecentView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as RecentView[]) : [];
    return Array.isArray(arr) ? arr.filter((v) => v && v.id) : [];
  } catch {
    return [];
  }
}

export function addRecentView(item: RecentView): void {
  if (typeof window === 'undefined' || !item?.id) return;
  try {
    const cur = getRecentViews().filter((v) => v.id !== item.id);
    cur.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}
