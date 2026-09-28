import { formatYen } from '@/lib/format';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_CLS, formatInvoiceNo, type InvoiceStatus } from '@/lib/invoices';
import { businessDisplayName, BUSINESS_TYPE_LABEL, TAX_STATUS_LABEL, type BusinessType, type TaxStatus } from '@/lib/business';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getFullYear()}/${String(x.getMonth() + 1).padStart(2, '0')}/${String(x.getDate()).padStart(2, '0')}`;
}

export type InvoiceDoc = {
  invoice_no: number; customer_name: string | null; vehicle_summary: string | null;
  subtotal: number; discount: number; tax: number; total: number; paid_amount: number;
  status: string; issue_date: string | null; due_date: string | null; note: string | null;
  bank_info: string | null; invoice_reg_no: string | null;
};
export type InvoiceItemRow = { id: string; label: string; amount: number; taxable: boolean };
export type InvoiceIssuer = {
  name?: string | null; company_name?: string | null; trade_name?: string | null;
  business_type?: string | null; representative?: string | null; address?: string | null; phone?: string | null;
  antique_license_no?: string | null; tax_status?: string | null;
};

export function InvoiceDocument({ inv, items, biz }: { inv: InvoiceDoc; items: InvoiceItemRow[]; biz: InvoiceIssuer | null }) {
  const balance = Math.max(0, (inv.total ?? 0) - (inv.paid_amount ?? 0));
  return (
    <div className="print-area card space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide">請求書</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{formatInvoiceNo(inv.invoice_no)}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>発行日：{fmtDate(inv.issue_date)}</p>
          <p>支払期限：{fmtDate(inv.due_date)}</p>
          <span className={`badge mt-1 inline-block ${INVOICE_STATUS_CLS[inv.status as InvoiceStatus]}`}>{INVOICE_STATUS_LABEL[inv.status as InvoiceStatus]}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold text-slate-400">請求先</p>
          <p className="text-lg font-bold">{inv.customer_name ?? 'お客様'} 様</p>
          {inv.vehicle_summary && <p className="mt-1 text-sm text-slate-600">{inv.vehicle_summary}</p>}
        </div>
        <div>
          <p className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold text-slate-400">販売者</p>
          <p className="font-bold">{businessDisplayName(biz ?? {})}</p>
          <p className="text-xs text-slate-600">
            {BUSINESS_TYPE_LABEL[(biz?.business_type as BusinessType) ?? 'corporation']}
            {biz?.representative ? `／代表 ${biz.representative}` : ''}
          </p>
          {biz?.address && <p className="text-xs text-slate-600">{biz.address}</p>}
          {biz?.phone && <p className="text-xs text-slate-600">TEL {biz.phone}</p>}
          {biz?.antique_license_no && <p className="text-xs text-slate-500">{biz.antique_license_no}</p>}
          <p className="mt-0.5 text-xs text-slate-500">
            {TAX_STATUS_LABEL[(biz?.tax_status as TaxStatus) ?? 'taxable']}
            {inv.invoice_reg_no ? `／登録番号 ${inv.invoice_reg_no}` : ''}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-navy-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-500">ご請求金額（税込）</p>
        <p className="text-3xl font-black text-navy-700">{formatYen(inv.total)}</p>
        {inv.paid_amount > 0 && (
          <p className="mt-1 text-xs text-slate-500">入金済 {formatYen(inv.paid_amount)} ／ 残額 <span className="font-bold text-amber-700">{formatYen(balance)}</span></p>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-400">
            <th className="py-1.5 text-left font-medium">項目</th>
            <th className="py-1.5 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-50">
              <td className="py-1.5">{it.label}{!it.taxable && <span className="ml-1 text-[10px] text-slate-400">(非課税)</span>}</td>
              <td className="py-1.5 text-right tabular-nums">{formatYen(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">小計</dt><dd>{formatYen(inv.subtotal)}</dd></div>
        {inv.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">値引き</dt><dd>-{formatYen(inv.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-slate-500">消費税</dt><dd>{formatYen(inv.tax)}</dd></div>
        <div className="flex justify-between border-t border-slate-200 pt-1 text-base"><dt className="font-black text-slate-700">合計</dt><dd className="font-black text-navy-700">{formatYen(inv.total)}</dd></div>
      </dl>

      {inv.bank_info && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">お振込先：{inv.bank_info}</p>}
      {inv.note && <p className="text-xs text-slate-600">備考：{inv.note}</p>}
    </div>
  );
}
