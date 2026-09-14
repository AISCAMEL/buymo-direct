import { PRICE_RANGES, YEAR_RANGES, MILEAGE_RANGES } from '@/lib/constants';

/**
 * listings クエリに検索フィルタを適用（status は呼び出し側で指定）。
 * 検索ページ・新着アラートで共通利用。query は supabase のクエリビルダ。
 *
 * 対応パラメータ:
 *   q, maker, model, body, pref（単一）, prefs（カンマ区切り複数）, norepair
 *   price_min / price_max（円）
 *   year_min / year_max（年）
 *   km_max（km上限）
 *   fuel, transmission
 *   旧パラメータ: price, year, mileage（インデックス方式・後方互換）
 */
export function applyListingFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  p: Record<string, string | undefined>
) {
  const q = p.q?.trim();
  if (q) {
    const safe = q.replace(/[%,]/g, ' ');
    query = query.or(`title.ilike.%${safe}%,maker.ilike.%${safe}%,model.ilike.%${safe}%`);
  }
  if (p.maker) query = query.eq('maker', p.maker);
  if (p.model) query = query.eq('model', p.model);
  if (p.body) query = query.eq('body_type', p.body);
  if (p.norepair === '1') query = query.eq('repair_history', false);

  // 地域（単一または複数）
  if (p.prefs) {
    const list = p.prefs.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) query = query.eq('prefecture', list[0]);
    else if (list.length > 1) query = query.in('prefecture', list);
  } else if (p.pref) {
    query = query.eq('prefecture', p.pref);
  }

  // 予算（新: price_min / price_max / 旧: price インデックス）
  if (p.price_min) query = query.gte('price', Number(p.price_min));
  if (p.price_max) query = query.lte('price', Number(p.price_max));
  if (!p.price_min && !p.price_max && p.price) {
    const r = PRICE_RANGES[Number(p.price)];
    if (r?.min != null) query = query.gte('price', r.min);
    if (r?.max != null) query = query.lt('price', r.max);
  }

  // 年式（新: year_min / year_max / 旧: year インデックス）
  if (p.year_min) query = query.gte('year', Number(p.year_min));
  if (p.year_max) query = query.lte('year', Number(p.year_max));
  if (!p.year_min && !p.year_max && p.year) {
    const r = YEAR_RANGES[Number(p.year)];
    if (r?.min != null) query = query.gte('year', r.min);
    if (r?.max != null) query = query.lt('year', r.max);
  }

  // 走行距離（新: km_max / 旧: mileage インデックス）
  if (p.km_max) query = query.lte('mileage_km', Number(p.km_max));
  if (!p.km_max && p.mileage) {
    const r = MILEAGE_RANGES[Number(p.mileage)];
    if (r?.min != null) query = query.gte('mileage_km', r.min);
    if (r?.max != null) query = query.lt('mileage_km', r.max);
  }

  // 燃料（複数選択：カンマ区切り対応）
  if (p.fuel) {
    const fuels = p.fuel.split(',').map((s) => s.trim()).filter(Boolean);
    if (fuels.length === 1) query = query.eq('fuel', fuels[0]);
    else if (fuels.length > 1) query = query.in('fuel', fuels);
  }

  // ミッション（複数選択：カンマ区切り対応）
  if (p.transmission) {
    const transmissions = p.transmission.split(',').map((s) => s.trim()).filter(Boolean);
    if (transmissions.length === 1) query = query.eq('transmission', transmissions[0]);
    else if (transmissions.length > 1) query = query.in('transmission', transmissions);
  }

  // 期限切れ出品を除外
  query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  return query;
}
