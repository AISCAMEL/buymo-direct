'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, Loader2, Info } from 'lucide-react';
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
  // 入力額は「上限額（自動入札の上限）」。システムは最小額で自動的にリードする。
  const [maxAmount, setMaxAmount] = useState<string>(String(minBid));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | 'bid' | 'buy'>(null);

  function onAmountChange(v: string) {
    const digits = v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    setMaxAmount(digits);
  }

  async function doBid() {
    setError(null); setInfo(null);
    const ceiling = Math.round(Number(maxAmount) || 0);
    if (ceiling < minBid) { setError(`上限額は最低 ${formatYen(minBid)} 以上で入力してください。`); return; }
    setLoading('bid');
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    fd.set('amount', String(minBid));       // 可視の入札額は最低必要額
    fd.set('max_amount', String(ceiling));  // 自動入札の上限
    const res = await placeBid(fd);
    setLoading(null);
    if (res && !res.ok) { setError(res.error ?? '入札できませんでした。'); return; }
    if (res && res.info) setInfo(res.info);
    router.refresh();
  }

  async function doBuyNow() {
    setError(null); setInfo(null);
    setLoading('buy');
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    const res = await buyNow(fd);
    setLoading(null);
    if (res && !res.ok) { setError(res.error ?? '購入できませんでした。'); return; }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="label">上限額（自動入札・最低 {formatYen(minBid)}）</label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder={String(minBid)}
            className="input flex-1"
          />
          <button onClick={doBid} disabled={!!loading} className="btn-accent shrink-0 disabled:opacity-50">
            {loading === 'bid' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} 入札する
          </button>
        </div>
        <p className="flex items-start gap-1 text-xs text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          入力した額を上限に、他の方を上回る<strong className="mx-0.5">最小額だけ</strong>自動で入札します（ヤフオク式の自動入札）。上限が高いほど競り合いに強くなります。
        </p>
      </div>

      {buyNowPrice != null && (
        <button onClick={doBuyNow} disabled={!!loading} className="btn-gold w-full disabled:opacity-50">
          {loading === 'buy' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `即決で購入する（${formatYen(buyNowPrice)}）`}
        </button>
      )}

      {info && <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">{info}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      {!loggedIn && <p className="text-xs text-slate-400">入札にはログインが必要です。ボタンを押すとログイン画面へ進みます。</p>}
    </div>
  );
}
