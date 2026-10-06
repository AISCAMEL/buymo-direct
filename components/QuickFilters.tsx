'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Check } from 'lucide-react';

type Chip = { label: string; params: Record<string, string> };

const CHIPS: Chip[] = [
  { label: '100万円以下', params: { price_max: '1000000' } },
  { label: '50万円以下', params: { price_max: '500000' } },
  { label: '修復歴なし', params: { norepair: '1' } },
  { label: '保証つき', params: { warranty: '1' } },
  { label: '車検残あり', params: { shaken: '1' } },
  { label: '5万km以下', params: { km_max: '50000' } },
  { label: '個人出品', params: { seller: 'user' } },
  { label: '加盟店', params: { seller: 'dealer' } },
];

export function QuickFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const isActive = (c: Chip) => Object.entries(c.params).every(([k, v]) => sp.get(k) === v);

  function toggle(c: Chip) {
    const next = new URLSearchParams(sp.toString());
    if (isActive(c)) {
      for (const k of Object.keys(c.params)) next.delete(k);
    } else {
      for (const [k, v] of Object.entries(c.params)) next.set(k, v);
    }
    next.delete('page'); // 条件変更で1ページ目へ
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mb-3 flex flex-wrap gap-1.5 print:hidden">
      {CHIPS.map((c) => {
        const on = isActive(c);
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => toggle(c)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition ${
              on
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
            }`}
          >
            {on && <Check className="h-3 w-3" />}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
