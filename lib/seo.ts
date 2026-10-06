export const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export type Crumb = { name: string; url: string };

/** BreadcrumbList 構造化データ（絶対URL推奨）。 */
export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

/** コレクション（車両一覧）の ItemList 構造化データ。 */
export function itemListJsonLd(name: string, urls: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url,
    })),
  };
}
