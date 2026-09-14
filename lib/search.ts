import { PRICE_RANGES, YEAR_RANGES, MILEAGE_RANGES } from '@/lib/constants';

const SORT_LABEL: Record<string, string> = {
  new: '新着順',
  price_asc: '価格が安い順',
  price_desc: '価格が高い順',
  mileage_asc: '走行が少ない順',
  year_desc: '年式が新しい順',
};

/** 保存検索の人間可読サマリ。 */
export function describeSearch(params: Record<string, string>): string {
  const parts: string[] = [];
  if (params.q) parts.push(`「${params.q}」`);
  if (params.maker) parts.push(params.maker);
  if (params.model) parts.push(params.model);
  if (params.body) parts.push(params.body);
  if (params.pref) parts.push(params.pref);
  if (params.year) {
    const r = YEAR_RANGES[Number(params.year)];
    if (r) parts.push(r.label);
  }
  if (params.mileage) {
    const r = MILEAGE_RANGES[Number(params.mileage)];
    if (r) parts.push(r.label);
  }
  if (params.price) {
    const r = PRICE_RANGES[Number(params.price)];
    if (r) parts.push(r.label);
  }
  if (params.fuel) parts.push(params.fuel);
  if (params.transmission) parts.push(params.transmission);
  if (params.norepair === '1') parts.push('修復歴なし');
  if (params.sort && params.sort !== 'new' && SORT_LABEL[params.sort]) parts.push(SORT_LABEL[params.sort]);
  return parts.length ? parts.join(' / ') : 'すべての車両';
}

/** params から /listings 用クエリ文字列を生成。 */
export function searchHref(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `/listings?${qs}` : '/listings';
}
