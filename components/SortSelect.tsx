'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS: { value: string; label: string }[] = [
  { value: 'new', label: '新着順' },
  { value: 'price_asc', label: '価格が安い順' },
  { value: 'price_desc', label: '価格が高い順' },
  { value: 'mileage_asc', label: '走行距離が少ない順' },
  { value: 'year_desc', label: '年式が新しい順' },
];

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'new') next.delete('sort');
    else next.set('sort', value);
    router.push(`/listings?${next.toString()}`);
  }

  return (
    <select
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold focus:border-navy-400 focus:outline-none"
      value={params.get('sort') ?? 'new'}
      onChange={(e) => onChange(e.target.value)}
      aria-label="並び替え"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
