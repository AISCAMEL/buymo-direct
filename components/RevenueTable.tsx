'use client';

import { useState, useMemo } from 'react';
import { formatYen } from '@/lib/format';

export interface RevenueRow {
  name: string;
  listings: number;
  sold: number;
  gmv: number;
  commission: number;
}

type SortKey = keyof RevenueRow;
type SortDir = 'asc' | 'desc';

interface RevenueTableProps {
  rows: RevenueRow[];
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block text-[10px] leading-none opacity-60">
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export default function RevenueTable({ rows }: RevenueTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('gmv');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'ja')
        : String(bv).localeCompare(String(av), 'ja');
    });
  }, [rows, sortKey, sortDir]);

  const columns: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'ディーラー名', align: 'left' },
    { key: 'listings', label: '出品数', align: 'right' },
    { key: 'sold', label: '成約数', align: 'right' },
    { key: 'gmv', label: 'GMV', align: 'right' },
    { key: 'commission', label: '手数料', align: 'right' },
  ];

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
          <tr>
            {columns.map(({ key, label, align }) => (
              <th
                key={key}
                className={`cursor-pointer select-none px-4 py-3 font-bold hover:text-slate-800 ${
                  align === 'right' ? 'text-right' : 'text-left'
                } ${sortKey === key ? 'text-navy-700' : ''}`}
                onClick={() => handleSort(key)}
              >
                {label}
                <SortIcon active={sortKey === key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
              <td className="px-4 py-3 text-right text-slate-600">{row.listings.toLocaleString('ja-JP')}</td>
              <td className="px-4 py-3 text-right text-slate-600">{row.sold.toLocaleString('ja-JP')}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-800">
                {formatYen(row.gmv)}
              </td>
              <td className="px-4 py-3 text-right font-bold" style={{ color: '#0F766E' }}>
                {formatYen(row.commission)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
