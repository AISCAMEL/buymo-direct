'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { createQuote } from '@/app/dealer/quotes/actions';
import { QUOTE_ITEM_PRESETS, computeQuoteTotals } from '@/lib/quotes';

type Row = { label: string; category: string; amount: number; taxable: boolean };

const yen = (n: number) => '¥' + (n || 0).toLocaleString('ja-JP');

export function QuoteForm({
  taxRate,
  presetVehicle,
  presetBuyer,
}: {
  taxRate: number;
  presetVehicle?: { listingId?: string; summary?: string; price?: number } | null;
  presetBuyer?: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    presetVehicle?.price
      ? [{ label: '車両本体価格', category: 'vehicle', amount: presetVehicle.price, taxable: true }]
      : [{ label: '車両本体価格', category: 'vehicle', amount: 0, taxable: true }]
  );
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState(presetBuyer?.name ?? '');
  const [vehicleSummary, setVehicleSummary] = useState(presetVehicle?.summary ?? '');
  const [validUntil, setValidUntil] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = computeQuoteTotals(rows, discount, taxRate);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow(preset?: { category: string; label: string }) {
    setRows((prev) => [...prev, { label: preset?.label ?? '', category: preset?.category ?? 'other', amount: 0, taxable: true }]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await createQuote({
      listingId: presetVehicle?.listingId ?? null,
      buyerId: presetBuyer?.id ?? null,
      customerName,
      vehicleSummary,
      validUntil: validUntil || null,
      note,
      discount,
      items: rows,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error ?? '保存に失敗しました'); return; }
    router.push(`/dealer/quotes/${res.id}`);
  }

  return (
    <div className="space-y-5">
      {/* 宛先・車両 */}
      <section className="card space-y-3 p-5">
        <h2 className="font-bold text-slate-700">宛先・車両</h2>
        <div>
          <label className="label">宛名（お客様名）</label>
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="例）山田 太郎 様" />
        </div>
        <div>
          <label className="label">車両概要</label>
          <input className="input" value={vehicleSummary} onChange={(e) => setVehicleSummary(e.target.value)} placeholder="例）2019年 ホンダ フィット 13G・Fパッケージ" />
        </div>
        <div>
          <label className="label">有効期限</label>
          <input type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </section>

      {/* 明細 */}
      <section className="card space-y-3 p-5">
        <h2 className="font-bold text-slate-700">見積明細</h2>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 p-2">
              <input
                className="input min-w-0 flex-1"
                value={r.label}
                onChange={(e) => setRow(i, { label: e.target.value })}
                placeholder="項目名"
              />
              <input
                type="number"
                className="input w-32"
                value={r.amount || ''}
                onChange={(e) => setRow(i, { amount: Math.round(Number(e.target.value) || 0) })}
                placeholder="金額"
              />
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="checkbox" checked={r.taxable} onChange={(e) => setRow(i, { taxable: e.target.checked })} />
                課税
              </label>
              <button type="button" onClick={() => removeRow(i)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUOTE_ITEM_PRESETS.map((p) => (
            <button key={p.category} type="button" onClick={() => addRow(p)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Plus className="mr-0.5 inline h-3 w-3" />{p.label}
            </button>
          ))}
        </div>
      </section>

      {/* 値引き・合計 */}
      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <label className="label mb-0">値引き（円）</label>
          <input type="number" className="input w-40" value={discount || ''} onChange={(e) => setDiscount(Math.max(0, Math.round(Number(e.target.value) || 0)))} placeholder="0" />
        </div>
        <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">小計</dt><dd className="font-bold">{yen(totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">値引き</dt><dd>-{yen(discount)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">消費税（{Math.round(taxRate * 100)}%）</dt><dd>{yen(totals.tax)}</dd></div>
          <div className="flex justify-between border-t border-slate-100 pt-1 text-lg"><dt className="font-black text-slate-700">合計</dt><dd className="font-black text-navy-700">{yen(totals.total)}</dd></div>
        </dl>
        <div>
          <label className="label">備考</label>
          <textarea rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="お支払い条件・納期など" />
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <button onClick={submit} disabled={saving} className="btn-accent w-full disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? '保存中…' : '見積を作成する'}
      </button>
    </div>
  );
}
