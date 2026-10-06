'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { MarketStats } from '@/lib/market';

function man(yen: number): string {
  const m = yen / 10000;
  const s = m >= 100 ? Math.round(m).toLocaleString('ja-JP') : (Math.round(m * 10) / 10).toLocaleString('ja-JP');
  return `${s}万円`;
}

/** 出品時の価格ガイド：同条件（メーカー・車種・年式±2年）の現役出品相場を表示。 */
export function PriceGuide({
  maker,
  model,
  year,
  onApply,
}: {
  maker?: string;
  model?: string;
  year?: number | null;
  onApply?: (price: number) => void;
}) {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!maker) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ maker });
        if (model) qs.set('model', model);
        if (year) qs.set('year', String(year));
        const res = await fetch(`/api/listings/market?${qs.toString()}`);
        const json = (await res.json()) as { stats: MarketStats | null };
        if (!cancelled) setStats(json.stats);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [maker, model, year]);

  if (!maker) return null;
  if (loading && !stats) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />相場を確認中…
      </p>
    );
  }
  if (!stats) {
    return (
      <p className="mt-1 text-xs text-slate-400">
        同条件の掲載が少なく、相場の目安を表示できません。
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
      <p className="mb-1.5 flex items-center gap-1 text-xs font-black text-teal-700">
        <TrendingUp className="h-3.5 w-3.5" />
        同条件の相場（目安）
        <span className="font-bold text-slate-400">
          ／ {model ? `${maker} ${model}` : maker}
          {year ? `・${year}年前後` : ''}・掲載{stats.count}台
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-bold text-slate-700">
          中央値 <span className="text-base font-black tabular-nums text-navy-700">{man(stats.medianPrice)}</span>
        </span>
        <span className="text-slate-500">平均 <span className="tabular-nums">{man(stats.avgPrice)}</span></span>
        <span className="text-slate-500">
          価格帯 <span className="tabular-nums">{man(stats.minPrice)}〜{man(stats.maxPrice)}</span>
        </span>
      </div>
      {onApply && (
        <button
          type="button"
          onClick={() => onApply(stats.medianPrice)}
          className="mt-2 inline-flex items-center rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
        >
          中央値（{man(stats.medianPrice)}）を価格に反映
        </button>
      )}
    </div>
  );
}
