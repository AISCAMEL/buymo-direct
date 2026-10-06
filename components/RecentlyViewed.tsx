'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { History } from 'lucide-react';
import { formatYen } from '@/lib/format';
import { addRecentView, getRecentViews, type RecentView } from '@/lib/recent-views';

/** 車両詳細で閲覧履歴を記録（表示なし）。 */
export function RecordView({ item }: { item: RecentView }) {
  useEffect(() => {
    addRecentView(item);
    // item.id が変わったら記録
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}

/** 最近見た車のストリップ。excludeId は表示から除外（現在の車両など）。 */
export function RecentlyViewed({ excludeId, title = '最近見た車' }: { excludeId?: string; title?: string }) {
  const [items, setItems] = useState<RecentView[]>([]);

  useEffect(() => {
    setItems(getRecentViews().filter((v) => v.id !== excludeId));
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="print:hidden">
      <h2 className="mb-3 flex items-center gap-1.5 text-lg font-black text-navy-700">
        <History className="h-5 w-5 text-navy-500" />
        {title}
      </h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {items.map((v) => (
          <Link
            key={v.id}
            href={`/listings/${v.id}`}
            className="card w-40 shrink-0 overflow-hidden transition hover:shadow-md"
          >
            <div className="relative aspect-[4/3] bg-slate-100">
              {v.cover ? (
                <Image src={v.cover} alt={v.title} fill className="object-cover" sizes="160px" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-300">No Image</div>
              )}
            </div>
            <div className="p-2">
              {(v.maker || v.model) && (
                <p className="truncate text-[11px] font-bold text-navy-400">{v.maker} {v.model}</p>
              )}
              <p className="line-clamp-1 text-xs font-bold text-slate-800">{v.title}</p>
              <p className="mt-0.5 text-sm font-black text-navy-600">{formatYen(v.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
