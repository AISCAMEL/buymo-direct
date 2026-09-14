import { Star } from 'lucide-react';
import { cn } from '@/lib/format';

/** Read-only star rating display. */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={cn('inline-flex items-center', className)} aria-label={`評価 ${value.toFixed(1)}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('h-4 w-4', i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
        />
      ))}
    </span>
  );
}
