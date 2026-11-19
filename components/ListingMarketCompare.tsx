'use client';

import { useEffect, useState } from 'react';
import { TrendingDown, BadgeCheck, Loader2 } from 'lucide-react';
import type { MarketCompareResult } from '@/lib/market-compare';

const yen = (n: number | null | undefined) => (n == null ? '—' : '¥' + Number(n).toLocaleString('ja-JP'));

// 出品中の車に対して、外部市場の相場をAIで推定し、この車の価格と並べて割安感を示す。
export function ListingMarketCompare({
  maker, model, year, mileageKm, price,
}: {
  maker: string;
  model: string;
  year?: number | null;
  mileageKm?: number | null;
  price: number;
}) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<MarketCompareResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/market-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maker, model, year: year ?? undefined, mileageKm: mileageKm ?? undefined }),
        });
        const data = (await res.json()) as { result?: MarketCompareResult };
        if (alive) setResult(data.result ?? null);
      } catch {
        if (alive) setResult(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [maker, model, year, mileageKm]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-accent-500" /> 市場価格を調べています…
        </p>
      </div>
    );
  }
  if (!result || result.channels.length === 0) return null; // 取得できなければ何も出さない

  const marketMids = result.channels.map((c) => Math.round((c.priceLow + c.priceHigh) / 2)).filter((n) => n > 0);
  const marketMid = marketMids.length ? Math.round(marketMids.reduce((a, b) => a + b, 0) / marketMids.length) : 0;
  const saving = marketMid - price;

  return (
    <div className="rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-black text-navy-800">
        <TrendingDown className="h-5 w-5 text-accent-600" /> 市場価格とくらべる
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">同条件の一般的な相場（AI推定）と、この車の価格をくらべました。</p>

      {saving > 20000 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-accent-500 bg-white px-3 py-2">
          <BadgeCheck className="h-5 w-5 shrink-0 text-accent-600" />
          <p className="text-sm font-black text-navy-800">
            市場の平均的な相場より <span className="text-accent-700">約{Math.round(saving / 10000).toLocaleString()}万円おトク</span>
          </p>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {result.channels.map((c, i) => (
              <tr key={i} className="text-slate-600">
                <td className="px-3 py-2 font-bold">{c.channel}</td>
                <td className="px-3 py-2 text-right tabular-nums">{yen(c.priceLow)}〜{yen(c.priceHigh)}</td>
              </tr>
            ))}
            <tr className="bg-accent-50/80 text-navy-900">
              <td className="px-3 py-2.5 font-black">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-accent-600" />この車（BUYMO）</span>
              </td>
              <td className="px-3 py-2.5 text-right text-base font-black tabular-nums text-accent-700">{yen(price)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {result.summary && <p className="mt-2 text-xs text-slate-500">{result.summary}</p>}
      <p className="mt-1.5 text-[10px] text-slate-400">※ 相場はAIによる概算です。実際の価格は車両の状態・装備により異なります。</p>
    </div>
  );
}
