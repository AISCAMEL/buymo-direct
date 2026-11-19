'use client';

import { useState } from 'react';
import { Search, Loader2, TrendingDown, BadgeCheck } from 'lucide-react';
import type { MarketCompareResult } from '@/lib/market-compare';

const yen = (n: number | null | undefined) => (n == null ? '—' : '¥' + Number(n).toLocaleString('ja-JP'));

export function MarketCompare({ initial }: { initial?: { maker?: string; model?: string; year?: number; mileageKm?: number } }) {
  const [maker, setMaker] = useState(initial?.maker ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [mileage, setMileage] = useState(initial?.mileageKm ? String(initial.mileageKm) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<MarketCompareResult | null>(null);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || !maker.trim()) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch('/api/market-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maker: maker.trim(),
          model: model.trim() || undefined,
          year: year ? Number(year) : undefined,
          mileageKm: mileage ? Number(mileage) : undefined,
        }),
      });
      const data = (await res.json()) as { result?: MarketCompareResult; error?: string };
      if (data.result) setResult(data.result);
      else setErr(data.error ?? '相場を取得できませんでした');
    } catch {
      setErr('通信に失敗しました。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={run} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="col-span-2 sm:col-span-1 text-xs font-bold text-slate-600">
            メーカー<span className="text-coral-500">*</span>
            <input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="トヨタ" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label className="col-span-2 sm:col-span-1 text-xs font-bold text-slate-600">
            車種
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="アクア" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            年式
            <input value={year} onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="2020" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            走行(km)
            <input value={mileage} onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="40000" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
        </div>
        <button type="submit" disabled={busy || !maker.trim()} className="btn-accent mt-3 inline-flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          市場価格をくらべる
        </button>
      </form>

      {err && <p className="rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">{err}</p>}

      {result && (
        <div className="space-y-4">
          {result.savingText && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-accent-500 bg-gradient-to-r from-accent-50 to-white px-4 py-3">
              <TrendingDown className="h-6 w-6 shrink-0 text-accent-600" />
              <p className="font-black text-navy-800">{result.savingText}</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-bold">販売ルート</th>
                  <th className="px-4 py-2.5 text-right font-bold">想定価格帯</th>
                  <th className="px-4 py-2.5 font-bold">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.channels.map((c, i) => (
                  <tr key={i} className="text-slate-700">
                    <td className="px-4 py-3 font-bold">{c.channel}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{yen(c.priceLow)}〜{yen(c.priceHigh)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.note ?? ''}</td>
                  </tr>
                ))}
                <tr className="bg-accent-50/70 text-navy-900">
                  <td className="px-4 py-3 font-black">
                    <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-accent-600" />BUYMO</span>
                  </td>
                  <td className="px-4 py-3 text-right font-black tabular-nums text-accent-700">{yen(result.buymoLow)}〜{yen(result.buymoHigh)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{result.buymoNote}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {result.summary && <p className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-700">{result.summary}</p>}
          <p className="text-[11px] text-slate-400">
            ※ 価格はAIによる相場の概算{result.fromInternal ? '（BUYMO価格は実際の出品データに基づく）' : ''}です。実際の販売価格は車両の状態・装備により異なります。
          </p>
        </div>
      )}
    </div>
  );
}
