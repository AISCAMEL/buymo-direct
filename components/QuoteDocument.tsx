import { formatYen } from '@/lib/format';
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_CLS, formatQuoteNo, type QuoteStatus } from '@/lib/quotes';
import { businessDisplayName, invoiceLabel, BUSINESS_TYPE_LABEL, TAX_STATUS_LABEL, type BusinessType, type TaxStatus } from '@/lib/business';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getFullYear()}/${String(x.getMonth() + 1).padStart(2, '0')}/${String(x.getDate()).padStart(2, '0')}`;
}

export type QuoteDoc = {
  quote_no: number; customer_name: string | null; vehicle_summary: string | null;
  subtotal: number; discount: number; tax: number; total: number;
  status: string; valid_until: string | null; note: string | null; created_at: string;
};
export type QuoteItemRow = { id: string; label: string; amount: number; taxable: boolean };
export type QuoteIssuer = {
  name?: string | null; company_name?: string | null; trade_name?: string | null;
  business_type?: string | null; representative?: string | null; address?: string | null; phone?: string | null;
  antique_license_no?: string | null; tax_status?: string | null;
  invoice_registered?: boolean | null; invoice_number?: string | null; bank_info?: string | null;
};

/** 見積書の印刷用ドキュメント（発行者・宛先・明細・合計）。 */
export function QuoteDocument({ q, items, biz }: { q: QuoteDoc; items: QuoteItemRow[]; biz: QuoteIssuer | null }) {
  return (
    <div className="print-area card space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wide">見積書</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{formatQuoteNo(q.quote_no)}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>発行日：{fmtDate(q.created_at)}</p>
          <p>有効期限：{fmtDate(q.valid_until)}</p>
          <span className={`badge mt-1 inline-block ${QUOTE_STATUS_CLS[q.status as QuoteStatus]}`}>{QUOTE_STATUS_LABEL[q.status as QuoteStatus]}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold text-slate-400">宛先</p>
          <p className="text-lg font-bold">{q.customer_name ?? 'お客様'} 様</p>
          {q.vehicle_summary && <p className="mt-1 text-sm text-slate-600">{q.vehicle_summary}</p>}
        </div>
        <div>
          <p className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold text-slate-400">発行者</p>
          <p className="font-bold">{businessDisplayName(biz ?? {})}</p>
          <p className="text-xs text-slate-600">
            {BUSINESS_TYPE_LABEL[(biz?.business_type as BusinessType) ?? 'corporation']}
            {biz?.representative ? `／代表 ${biz.representative}` : ''}
          </p>
          {biz?.address && <p className="text-xs text-slate-600">{biz.address}</p>}
          {biz?.phone && <p className="text-xs text-slate-600">TEL {biz.phone}</p>}
          {biz?.antique_license_no && <p className="text-xs text-slate-500">{biz.antique_license_no}</p>}
          <p className="mt-0.5 text-xs text-slate-500">{TAX_STATUS_LABEL[(biz?.tax_status as TaxStatus) ?? 'taxable']}／{invoiceLabel(biz ?? {})}</p>
        </div>
      </div>

      <div className="rounded-xl bg-navy-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-500">お見積金額（税込）</p>
        <p className="text-3xl font-black text-navy-700">{formatYen(q.total)}</p>
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
        <div className="flex justify-between"><dt className="text-slate-500">小計</dt><dd>{formatYen(q.subtotal)}</dd></div>
        {q.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">値引き</dt><dd>-{formatYen(q.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-slate-500">消費税</dt><dd>{formatYen(q.tax)}</dd></div>
        <div className="flex justify-between border-t border-slate-200 pt-1 text-base"><dt className="font-black text-slate-700">合計</dt><dd className="font-black text-navy-700">{formatYen(q.total)}</dd></div>
      </dl>

      {q.note && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">備考：{q.note}</p>}
      {biz?.bank_info && <p className="text-xs text-slate-500">お振込先：{biz.bank_info}</p>}
    </div>
  );
}
