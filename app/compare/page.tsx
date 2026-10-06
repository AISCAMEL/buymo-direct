'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCompareIds } from '@/lib/compare-store';
import { createClient } from '@/lib/supabase/client';
import { formatYen, formatMileage } from '@/lib/format';
import { monthlyPayment } from '@/lib/loan';
import { LOAN_APR_FROM } from '@/lib/constants';
import type { ListingWithImages } from '@/lib/types';

type Row = {
  label: string;
  key?: keyof ListingWithImages;
  compute?: (l: ListingWithImages) => number | string | null;
  format?: (v: unknown) => string;
  highlight?: 'min' | 'max';
};

const ROWS: Row[] = [
  { label: '価格', key: 'price', format: (v) => formatYen(v as number), highlight: 'min' },
  { label: 'ローン月々(60回)', compute: (l) => monthlyPayment(l.price, LOAN_APR_FROM, 60), format: (v) => `${formatYen(v as number)}〜`, highlight: 'min' },
  { label: '年式', key: 'year', format: (v) => `${v}年`, highlight: 'max' },
  { label: '走行距離', key: 'mileage_km', format: (v) => formatMileage(v as number), highlight: 'min' },
  { label: 'メーカー', key: 'maker' },
  { label: '車種', key: 'model' },
  { label: '燃料', key: 'fuel', format: (v) => (v as string | null) ?? '—' },
  { label: 'MT/AT', key: 'transmission', format: (v) => (v as string | null) ?? '—' },
  { label: '都道府県', key: 'prefecture' },
  { label: '修復歴', key: 'repair_history', format: (v) => (v ? 'あり' : 'なし') },
  { label: '保証', compute: (l) => ((l as { warranty_fee?: number | null }).warranty_fee ?? 0) > 0 ? '保証つき' : '—' },
];

function getCoverUrl(listing: ListingWithImages): string | null {
  const sorted = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.url ?? null;
}

export default function ComparePage() {
  const [listings, setListings] = useState<ListingWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getCompareIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from('listings')
      .select('*, listing_images(*)')
      .in('id', ids)
      .then(({ data }) => {
        if (data) setListings(data as ListingWithImages[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        読み込み中…
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-slate-500">
        <p className="text-lg font-bold">比較する車両が選択されていません</p>
        <Link href="/" className="btn-primary">
          車両を探す
        </Link>
      </div>
    );
  }

  function rowValue(row: Row, l: ListingWithImages): number | string | null {
    if (row.compute) return row.compute(l);
    return row.key ? (l[row.key] as number | string | null) : null;
  }

  function getBestIndex(row: Row): number | null {
    if (!row.highlight) return null;
    const values = listings.map((l) => Number(rowValue(row, l)));
    if (values.some((v) => isNaN(v))) return null;
    const target =
      row.highlight === 'min' ? Math.min(...values) : Math.max(...values);
    // 全車同値ならベストなし（ハイライトしない）
    if (values.every((v) => v === values[0])) return null;
    return values.indexOf(target);
  }

  // 総合おすすめ：ハイライト行で「ベスト」を取った数を列ごとに集計
  const bestCounts = listings.map(() => 0);
  for (const row of ROWS) {
    const bi = getBestIndex(row);
    if (bi != null) bestCounts[bi] += 1;
  }
  const maxBest = Math.max(...bestCounts, 0);

  return (
    <div className="overflow-x-auto">
      <h1 className="mb-6 text-2xl font-black text-navy-500">車両比較</h1>

      <table className="w-full min-w-[480px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-28" />
          {listings.map((l) => (
            <col key={l.id} />
          ))}
        </colgroup>

        {/* Car header */}
        <thead>
          <tr>
            <th className="border border-slate-200 bg-slate-50 p-2" />
            {listings.map((listing) => {
              const cover = getCoverUrl(listing);
              return (
                <th
                  key={listing.id}
                  className="border border-slate-200 bg-slate-50 p-3 align-top font-normal"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-28 w-full overflow-hidden rounded bg-slate-100">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={listing.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 80vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-300">
                          No Image
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-2 text-center text-xs font-bold text-navy-500">
                      {listing.title}
                    </p>
                    <Link
                      href={`/listings/${listing.id}`}
                      className="text-xs font-bold text-navy-400 underline hover:text-navy-500"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Comparison rows */}
        <tbody>
          {ROWS.map((row) => {
            const bestIdx = getBestIndex(row);
            return (
              <tr key={row.key as string} className="even:bg-slate-50">
                <td className="border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700">
                  {row.label}
                </td>
                {listings.map((listing, colIdx) => {
                  const raw = rowValue(row, listing);
                  const display = row.format ? row.format(raw) : String(raw ?? '—');
                  const isBest = bestIdx === colIdx;
                  return (
                    <td
                      key={listing.id}
                      className={[
                        'border border-slate-200 px-3 py-2 text-center',
                        isBest ? 'bg-emerald-50 font-bold text-emerald-700' : '',
                      ].join(' ')}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* 総合おすすめ（ベスト項目数） */}
          {listings.length > 1 && maxBest > 0 && (
            <tr className="bg-navy-50">
              <td className="border border-slate-200 bg-white px-3 py-2 font-bold text-navy-700">総合おすすめ</td>
              {listings.map((listing, colIdx) => {
                const n = bestCounts[colIdx];
                const isTop = n === maxBest && n > 0;
                return (
                  <td
                    key={listing.id}
                    className={[
                      'border border-slate-200 px-3 py-2 text-center',
                      isTop ? 'bg-navy-500 font-black text-white' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {isTop ? `★ 最有力（${n}項目でベスト）` : `${n}項目でベスト`}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
