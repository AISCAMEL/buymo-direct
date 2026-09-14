'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompare, X } from 'lucide-react';
import { getCompareIds, removeFromCompare, clearCompare } from '@/lib/compare-store';

export function CompareBar() {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setIds(getCompareIds());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('compare-updated', refresh);
    return () => window.removeEventListener('compare-updated', refresh);
  }, [refresh]);

  function handleRemoveSlot(id: string) {
    removeFromCompare(id);
    setIds(getCompareIds());
    window.dispatchEvent(new Event('compare-updated'));
  }

  function handleClear() {
    clearCompare();
    setIds([]);
    window.dispatchEvent(new Event('compare-updated'));
  }

  const visible = ids.length > 0;

  return (
    <div
      className={[
        'fixed bottom-16 left-0 right-0 z-40 bg-navy-500 text-white shadow-lg transition-transform duration-300 sm:bottom-0',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <GitCompare className="h-5 w-5 shrink-0 text-navy-200" />

        {/* Slots */}
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {[0, 1, 2].map((i) => {
            const id = ids[i];
            return (
              <div
                key={i}
                className={[
                  'flex min-w-[80px] items-center justify-center rounded border px-2 py-1 text-xs',
                  id
                    ? 'border-navy-200 bg-navy-400 text-white'
                    : 'border-dashed border-navy-200/50 text-navy-200',
                ].join(' ')}
              >
                {id ? (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[60px] truncate font-bold">車両{i + 1}</span>
                    <button
                      onClick={() => handleRemoveSlot(id)}
                      aria-label="削除"
                      className="shrink-0 opacity-70 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  <span>＋ 追加</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleClear}
            className="rounded px-2 py-1 text-xs text-navy-200 hover:bg-navy-400"
          >
            クリア
          </button>
          <button
            onClick={() => router.push('/compare')}
            disabled={ids.length < 2}
            className="rounded bg-accent-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-600 disabled:opacity-40"
          >
            比較する
          </button>
        </div>
      </div>
    </div>
  );
}
