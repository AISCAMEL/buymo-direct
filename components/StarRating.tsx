import { Star } from 'lucide-react';

/** 星評価の表示（0〜5、0.5刻みで塗り分け）。平均値＋件数を併記できる。 */
export function StarRating({
  value,
  count,
  size = 'sm',
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}) {
  const px = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const rounded = Math.round(value * 2) / 2; // 0.5刻み
  return (
    <span className="inline-flex items-center gap-1" aria-label={`評価 ${value.toFixed(1)}（5点満点）`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const full = rounded >= i;
          const half = !full && rounded >= i - 0.5;
          return (
            <span key={i} className="relative inline-block">
              <Star className={`${px} text-slate-200`} fill="currentColor" />
              {(full || half) && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: half ? '50%' : '100%' }}>
                  <Star className={`${px} text-gold-500`} fill="currentColor" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="text-xs font-bold tabular-nums text-slate-600">{value.toFixed(1)}</span>
      {typeof count === 'number' && <span className="text-xs text-slate-400">（{count}件）</span>}
    </span>
  );
}
