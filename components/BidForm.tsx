'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, Loader2 } from 'lucide-react';
import { placeBid, buyNow } from '@/app/parts/actions';
import { formatYen } from '@/lib/format';

export function BidForm({
  auctionId,
  minBid,
  buyNowPrice,
  loggedIn,
}: {
  auctionId: string;
  minBid: number;
  buyNowPrice: number | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(minBid);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | 'bid' | 'buy'>(null);

  async function doBid() {
    setError(null);
    setLoading('bid');
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    fd.set('amount', String(Math.round(amount)));
    const res = await placeBid(fd);
    setLoading(null);
    if (res && !res.ok) setError(res.error ?? '入札できませんでした。');
    else router.refresh();
  }

  async function doBuyNow() {
    setError(null);
    setLoading('buy');
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    const res = await buyNow(fd);
    setLoading(null);
    if (res && !res.ok) setError(res.error ?? '購入できませんでした。');
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="label">入札額（最低 {formatYen(minBid)}）</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={minBid}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input flex-1"
          />
          <button onClick={doBid} disabled={!!loading} className="btn-accent shrink-0 disabled:opacity-50">
            {loading === 'bid' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} 入札する
          </button>
        </div>
        <p className="text-xs text-slate-400">入札単位に応じて、現在価格を上回る額で入札してください。</p>
      </div>

      {buyNowPrice != null && (
        <button onClick={doBuyNow} disabled={!!loading} className="btn-gold w-full disabled:opacity-50">
          {loading === 'buy' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `即決で購入する（${formatYen(buyNowPrice)}）`}
        </button>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      {!loggedIn && <p className="text-xs text-slate-400">入札にはログインが必要です。ボタンを押すとログイン画面へ進みます。</p>}
    </div>
  );
}
