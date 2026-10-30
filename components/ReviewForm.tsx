'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2, Gift, Copy, Check } from 'lucide-react';
import { submitReview } from '@/app/escrow/actions';
import { cn } from '@/lib/format';

export function ReviewForm({
  escrowId,
  revieweeId,
  revieweeName,
}: {
  escrowId: string;
  revieweeId: string;
  revieweeName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneCoupon, setDoneCoupon] = useState<string | null | 'done'>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await submitReview(escrowId, revieweeId, rating, comment);
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else {
      const c = (res as { coupon?: string | null }).coupon;
      setDoneCoupon(c ?? 'done');
      router.refresh();
    }
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  // 投稿完了：お礼クーポンを表示
  if (doneCoupon !== null) {
    const code = doneCoupon === 'done' ? null : doneCoupon;
    return (
      <div className="card space-y-3 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="font-bold text-slate-800">口コミを投稿しました。ありがとうございます！</p>
        {code ? (
          <div className="rounded-xl border-2 border-dashed border-accent-300 bg-accent-50/60 p-4">
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-accent-700">
              <Gift className="h-4 w-4" /> お礼に次回使える¥5,000クーポンをプレゼント
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <code className="rounded-lg bg-white px-3 py-1.5 text-lg font-black tracking-wider text-navy-800">{code}</code>
              <button
                type="button"
                onClick={() => copyCode(code)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                aria-label="コードをコピー"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              180日間有効・1回限り。次回のお取引のお支払い画面で入力いただけます。通知にも保存しました。
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">評価のご協力ありがとうございました。</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-6">
      <h2 className="font-bold">{revieweeName} さんを評価する</h2>
      <p className="flex items-center gap-1.5 rounded-lg bg-accent-50 px-3 py-2 text-sm font-bold text-accent-700">
        <Gift className="h-4 w-4" /> 口コミ投稿で、次回使える¥5,000クーポンをプレゼント！
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${i}つ星`}
          >
            <Star className={cn('h-7 w-7 transition', i <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="取引の感想（任意）：対応の丁寧さ、車両状態など"
      />
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-accent">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} 評価を投稿する
      </button>
    </form>
  );
}
