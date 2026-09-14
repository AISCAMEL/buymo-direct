'use client';

import { useState, useEffect } from 'react';
import { GitCompare } from 'lucide-react';
import { addToCompare, removeFromCompare, isInCompare } from '@/lib/compare-store';
import { cn } from '@/lib/format';

function dispatchCompareUpdated() {
  window.dispatchEvent(new Event('compare-updated'));
}

export function CompareButton({ listingId }: { listingId: string }) {
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast] = useState(false);

  // Read localStorage only on client
  useEffect(() => {
    setInCompare(isInCompare(listingId));
  }, [listingId]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (inCompare) {
      removeFromCompare(listingId);
      setInCompare(false);
      dispatchCompareUpdated();
    } else {
      const added = addToCompare(listingId);
      if (!added) {
        // Limit reached
        setToast(true);
        setTimeout(() => setToast(false), 2500);
        return;
      }
      setInCompare(true);
      dispatchCompareUpdated();
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label={inCompare ? '比較から削除' : '比較に追加'}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition',
          inCompare
            ? 'bg-navy-400 text-white hover:bg-navy-500'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        )}
      >
        <GitCompare className="h-3.5 w-3.5" />
        {inCompare ? '比較中' : '比較に追加'}
      </button>

      {toast && (
        <div
          role="alert"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
        >
          比較は3台までです
        </div>
      )}
    </>
  );
}
