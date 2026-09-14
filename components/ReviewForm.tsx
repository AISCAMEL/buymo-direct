'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2 } from 'lucide-react';
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await submitReview(escrowId, revieweeId, rating, comment);
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-6">
      <h2 className="font-bold">{revieweeName} さんを評価する</h2>
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
