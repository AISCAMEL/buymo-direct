'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { toggleWatch } from '@/app/parts/actions';

export function WatchButton({ auctionId, initialWatching }: { auctionId: string; initialWatching: boolean }) {
  const router = useRouter();
  const [watching, setWatching] = useState(initialWatching);
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    const res = await toggleWatch(fd);
    setLoading(false);
    if (res?.ok) {
      setWatching(!!res.watching);
      router.refresh();
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${
        watching
          ? 'border-rose-200 bg-rose-50 text-rose-600'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
      aria-pressed={watching}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${watching ? 'fill-rose-500 text-rose-500' : ''}`} />}
      {watching ? 'ウォッチ中' : 'ウォッチ'}
    </button>
  );
}
