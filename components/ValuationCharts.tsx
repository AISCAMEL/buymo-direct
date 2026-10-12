import { BarChart3, LineChart } from 'lucide-react';

type Bucket = { label: string; count: number };
type Point = { label: string; value: number };

const man = (yen: number) => `${Math.round(yen / 10000).toLocaleString('ja-JP')}万`;

/** 相場分布（同条件の出品価格のヒストグラム）。単一色・値ラベル付きで凡例不要。 */
export function PriceHistogram({ buckets }: { buckets: Bucket[] }) {
  if (!buckets || buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const total = buckets.reduce((s, b) => s + b.count, 0);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-black text-slate-700">
        <BarChart3 className="h-4 w-4 text-navy-500" /> 同条件の販売価格分布（{total}台）
      </p>
      <ul className="space-y-1.5">
        {buckets.map((b) => (
          <li key={b.label} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-right tabular-nums text-slate-500">{b.label}</span>
            <span className="flex h-5 flex-1 items-center">
              <span
                className="h-3 rounded-sm bg-navy-500"
                style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="ml-1.5 font-bold tabular-nums text-slate-600">{b.count}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">※ BUYMO の現役出品（ダイレクト販売価格）の分布です。</p>
    </div>
  );
}

/** 相場トレンド（過去査定の月次平均）。単一色の折れ線＋端点ラベル。 */
export function PriceTrend({ points }: { points: Point[] }) {
  if (!points || points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const W = 300, H = 96, padX = 8, padY = 14;
  const stepX = (W - padX * 2) / (points.length - 1);
  const y = (v: number) => H - padY - ((v - min) / span) * (H - padY * 2);
  const coords = points.map((p, i) => ({ x: padX + stepX * i, y: y(p.value), ...p }));
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${H - padY} L${coords[0].x.toFixed(1)},${H - padY} Z`;
  const last = coords[coords.length - 1];
  const first = points[0].value, lastV = points[points.length - 1].value;
  const delta = lastV - first;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-black text-slate-700">
        <LineChart className="h-4 w-4 text-navy-500" /> 相場トレンド（月次・査定の平均）
      </p>
      <p className="mb-2 text-xs text-slate-500">
        直近 {points.length}か月：{man(first)} → <span className="font-bold text-navy-700">{man(lastV)}</span>
        <span className={`ml-1 font-bold ${delta < 0 ? 'text-red-500' : delta > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
          （{delta > 0 ? '+' : ''}{man(delta)}）
        </span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="相場トレンド折れ線">
        <path d={area} fill="rgb(30 58 95 / 0.08)" />
        <path d={line} fill="none" stroke="rgb(30 58 95)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c) => <circle key={c.label} cx={c.x} cy={c.y} r="2.5" fill="rgb(30 58 95)" />)}
        <circle cx={last.x} cy={last.y} r="4" fill="rgb(234 179 8)" stroke="#fff" strokeWidth="1.5" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
