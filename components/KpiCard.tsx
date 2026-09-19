import type { ComponentType } from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ComponentType<{ className?: string }>;
  color?: string;
}

export default function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  color = '#0F766E',
}: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>

        {change !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {isPositive ? '↑' : '↓'}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-black tracking-tight" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-sm text-slate-500">{title}</p>
    </div>
  );
}
