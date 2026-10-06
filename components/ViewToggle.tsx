'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const view = sp.get('view') === 'list' ? 'list' : 'grid';

  function set(v: 'grid' | 'list') {
    const next = new URLSearchParams(sp.toString());
    if (v === 'grid') next.delete('view');
    else next.set('view', 'list');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const base = 'flex h-9 w-9 items-center justify-center rounded-md transition';
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="表示切替">
      <button
        type="button"
        onClick={() => set('grid')}
        aria-pressed={view === 'grid'}
        aria-label="グリッド表示"
        className={`${base} ${view === 'grid' ? 'bg-navy-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => set('list')}
        aria-pressed={view === 'list'}
        aria-label="リスト表示"
        className={`${base} ${view === 'list' ? 'bg-navy-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
