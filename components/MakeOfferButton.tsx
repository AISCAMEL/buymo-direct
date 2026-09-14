'use client';

import { useState } from 'react';
import { Tag, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { makeOffer } from '@/app/dashboard/offers/actions';
import { formatYen } from '@/lib/format';

type ExistingOffer = {
  amount: number;
  status: string;
  counter_amount: number | null;
} | null;

export function MakeOfferButton({
  listingId,
  listingPrice,
  existingOffer,
}: {
  listingId: string;
  listingPrice: number;
  existingOffer: ExistingOffer;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Math.floor(listingPrice * 0.95));
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // アクティブなオファーがある場合は状態を表示
  if (existingOffer) {
    const label =
      existingOffer.status === 'pending' ? '審査待ち' :
      existingOffer.status === 'countered' ? '反対提示あり' :
      existingOffer.status === 'accepted' ? '成立済み' : '';

    if (existingOffer.status === 'accepted') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          オファー成立（{formatYen(existingOffer.counter_amount ?? existingOffer.amount)}）
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <p className="font-bold text-amber-700">
          <Tag className="mr-1 inline h-3.5 w-3.5" />
          {label}：{formatYen(existingOffer.amount)}
        </p>
        {existingOffer.status === 'countered' && existingOffer.counter_amount && (
          <p className="mt-0.5 text-amber-600">
            売主からの提示：{formatYen(existingOffer.counter_amount)}
          </p>
        )}
        <p className="mt-1 text-xs text-amber-500">
          <a href="/dashboard/offers" className="font-bold underline">オファー管理</a>から操作できます
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        オファーを送信しました。売主の返答をお待ちください。
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await makeOffer(listingId, amount, message);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      setDone(true);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
      >
        <span className="flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-navy-500" />
          価格交渉する
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
          <div>
            <label className="label text-xs">提示額（円）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                required
                min={1}
                max={listingPrice * 2}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input flex-1"
              />
              <span className="shrink-0 text-xs text-slate-500">
                定価比 {listingPrice > 0 ? Math.round((amount / listingPrice) * 100) : 0}%
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">定価：{formatYen(listingPrice)}</p>
          </div>

          <div>
            <label className="label text-xs">メッセージ（任意）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="理由や希望条件を添えると承認されやすくなります"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-accent w-full disabled:opacity-50">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '送信中…' : 'オファーを送る'}
          </button>
        </form>
      )}
    </div>
  );
}
