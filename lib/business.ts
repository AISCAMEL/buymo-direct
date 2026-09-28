// 事業者区分・課税区分・インボイスの表示ヘルパー。
// 税務判断は行わず、登録情報の表示・整形のみ。

export type BusinessType = 'corporation' | 'sole_proprietor';
export type TaxStatus = 'taxable' | 'exempt';

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  corporation: '法人',
  sole_proprietor: '個人事業主',
};

export const TAX_STATUS_LABEL: Record<TaxStatus, string> = {
  taxable: '課税事業者',
  exempt: '免税事業者',
};

export type DealerBusiness = {
  business_type?: string | null;
  company_name?: string | null;
  trade_name?: string | null;
  representative?: string | null;
  corporate_number?: string | null;
  antique_license_no?: string | null;
  tax_status?: string | null;
  invoice_registered?: boolean | null;
  invoice_number?: string | null;
};

/** インボイス登録の表示文字列（登録あり→番号、なし→区分）。 */
export function invoiceLabel(d: DealerBusiness): string {
  if (d.invoice_registered && d.invoice_number) return `適格請求書発行事業者（登録番号 ${d.invoice_number}）`;
  if (d.invoice_registered) return '適格請求書発行事業者（登録番号 未入力）';
  return 'インボイス制度 登録なし';
}

/** 事業者の表示名（法人=会社名、個人事業主=屋号 or 氏名）。 */
export function businessDisplayName(d: DealerBusiness & { name?: string | null }): string {
  if (d.business_type === 'sole_proprietor') return d.trade_name || d.name || '—';
  return d.company_name || d.name || '—';
}
