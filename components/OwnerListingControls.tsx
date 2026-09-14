'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Pencil, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { setListingStatus, deleteListing } from '@/app/listings/[id]/actions';
import type { ListingStatus } from '@/lib/types';

export function OwnerListingControls({
  listingId,
  status,
  compact = false,
}: {
  listingId: string;
  status: ListingStatus;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next: ListingStatus = status === 'active' ? 'closed' : 'active';
    startTransition(() => setListingStatus(listingId, next));
  };

  const remove = () => {
    if (!confirm('この出品を削除します。取引中の会話もすべて消えます。よろしいですか？')) return;
    startTransition(() => deleteListing(listingId));
  };

  // reserved / sold は状態変更不可（取引が進行中・完了のため）
  const lockedStatus = status === 'reserved' || status === 'sold';

  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid gap-2'}>
      <Link href={`/listings/${listingId}/edit`} className="btn-outline">
        <Pencil className="h-4 w-4" /> 編集
      </Link>

      {!lockedStatus && (
        <button onClick={toggle} disabled={pending} className="btn-outline">
          {status === 'active' ? (
            <><EyeOff className="h-4 w-4" /> 取り下げ</>
          ) : (
            <><RotateCcw className="h-4 w-4" /> 再出品</>
          )}
        </button>
      )}

      <button onClick={remove} disabled={pending} className="btn-outline text-red-600">
        <Trash2 className="h-4 w-4" /> 削除
      </button>
    </div>
  );
}
