'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SearchFilters } from '@/components/SearchFilters';

const FILTER_KEYS = [
  'maker', 'model', 'body', 'fuel', 'transmission', 'norepair',
  // 旧
  'price', 'year', 'mileage', 'pref',
  // 新
  'price_min', 'price_max', 'year_min', 'year_max', 'km_max', 'prefs',
];

export function MobileFilterButton() {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        絞り込み
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-600 px-1 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />

          {/* ボトムシート */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-2xl lg:hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-black">絞り込み</h2>
              {activeCount > 0 && (
                <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-bold text-navy-600">
                  {activeCount}件の条件
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="ml-auto rounded-full p-1.5 hover:bg-slate-100"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <SearchFilters />
            </div>

            <div className="shrink-0 border-t border-slate-100 px-4 py-4">
              <button onClick={() => setOpen(false)} className="btn-primary w-full py-3 text-base">
                この条件で検索する
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
