// 加盟店募集の「動線」計測：どの広告・リンク（UTM）・参照元から申込に至ったかを記録する。
// 初回接触（first-touch）をCookieに保存し、加盟申込時にその値を申込レコードへ焼き付ける。
import { cookies } from 'next/headers';

export const ATTR_COOKIE = 'buymo_attr';

export type Attribution = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
  referrer?: string | null;
  landing?: string | null;
  ts?: number | null;
};

/** サーバー側でCookieから初回接触の流入情報を読む。無ければ空。 */
export async function readAttribution(): Promise<Attribution> {
  try {
    const store = await cookies();
    const raw = store.get(ATTR_COOKIE)?.value;
    if (!raw) return {};
    const obj = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 120) : null);
    return {
      source: s(obj.source),
      medium: s(obj.medium),
      campaign: s(obj.campaign),
      term: s(obj.term),
      content: s(obj.content),
      referrer: s(obj.referrer),
      landing: s(obj.landing),
      ts: typeof obj.ts === 'number' ? obj.ts : null,
    };
  } catch {
    return {};
  }
}

/** 申込レコードに焼き付ける列（franchise_applications の拡張列）。 */
export function attributionColumns(a: Attribution): Record<string, string | null> {
  return {
    utm_source: a.source ?? null,
    utm_medium: a.medium ?? null,
    utm_campaign: a.campaign ?? null,
    utm_term: a.term ?? null,
    utm_content: a.content ?? null,
    referrer: a.referrer ?? null,
    landing_path: a.landing ?? null,
  };
}

export type AttrRow = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
};

/** 流入元の表示ラベル（source/medium、無ければ参照元、無ければ直接）。 */
export function attrLabel(r: AttrRow): string {
  if (r.utm_source) return r.utm_source + (r.utm_medium ? ` / ${r.utm_medium}` : '');
  if (r.referrer) {
    try { return '参照: ' + new URL(r.referrer).hostname.replace(/^www\./, ''); } catch { return '参照: ' + r.referrer.slice(0, 40); }
  }
  return '直接・不明';
}

export type AttrBucket = { label: string; count: number; campaigns: Record<string, number> };

/** 申込群を流入元ごとに集計（ダッシュボード用）。 */
export function summarizeAttribution(rows: AttrRow[]): { buckets: AttrBucket[]; total: number } {
  const map = new Map<string, AttrBucket>();
  for (const r of rows) {
    const label = attrLabel(r);
    const b = map.get(label) ?? { label, count: 0, campaigns: {} };
    b.count += 1;
    const camp = r.utm_campaign || '（キャンペーン指定なし）';
    b.campaigns[camp] = (b.campaigns[camp] ?? 0) + 1;
    map.set(label, b);
  }
  const buckets = Array.from(map.values()).sort((a, b) => b.count - a.count);
  return { buckets, total: rows.length };
}
