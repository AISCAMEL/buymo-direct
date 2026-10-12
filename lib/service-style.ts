// プロの営業形態（店舗型 / 出張型 / 店舗＋出張）の共通定義。副作用なし。

export type ServiceStyle = 'shop' | 'mobile' | 'both';

export const SERVICE_STYLE_LABEL: Record<ServiceStyle, string> = {
  shop: '店舗型',
  mobile: '出張型',
  both: '店舗＋出張',
};

/** 任意の値を ServiceStyle に正規化（不明は 'shop'）。 */
export function normalizeStyle(v: unknown): ServiceStyle {
  return v === 'mobile' || v === 'both' ? v : 'shop';
}

/** service_style カラムが無い環境向け：テキストから出張型を推定するフォールバック。 */
export function deriveStyle(...texts: (string | null | undefined)[]): ServiceStyle {
  const t = texts.filter(Boolean).join(' ');
  const mobile = /出張|訪問|お伺い|ご自宅|自宅まで|職場まで|来てもらえる|駆けつけ|現地/.test(t);
  const shop = /来店|ご来店|店舗|ご来店|持ち込み|お持ち込み|工場/.test(t);
  if (mobile && shop) return 'both';
  if (mobile) return 'mobile';
  return 'shop';
}

/** 出張対応（mobile または both）か。 */
export function isMobile(style: ServiceStyle): boolean {
  return style === 'mobile' || style === 'both';
}
/** 店舗対応（shop または both）か。 */
export function isShop(style: ServiceStyle): boolean {
  return style === 'shop' || style === 'both';
}
