'use client';

import { useId } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

const PADDING = { top: 36, right: 16, bottom: 48, left: 16 };
const VIEWBOX_WIDTH = 600;

export default function BarChart({
  data,
  height = 220,
  color = '#1e3a5f',
  formatValue = (v) => v.toLocaleString('ja-JP'),
}: BarChartProps) {
  const uid = useId();
  const clipId = `bar-clip-${uid}`;

  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value));
  const chartW = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const barWidth = Math.min(48, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;

  const gridLines = 4;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      style={{ display: 'block' }}
      aria-label="棒グラフ"
      role="img"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={PADDING.left} y={PADDING.top} width={chartW} height={chartH} />
        </clipPath>
        <style>{`
          @keyframes bar-grow-${uid.replace(/:/g, '')} {
            from { transform: scaleY(0); }
            to   { transform: scaleY(1); }
          }
          .bar-animated-${uid.replace(/:/g, '')} {
            animation: bar-grow-${uid.replace(/:/g, '')} 0.55s cubic-bezier(.22,.68,0,1.2) both;
            transform-origin: bottom;
          }
        `}</style>
      </defs>

      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const y = PADDING.top + (chartH / gridLines) * i;
        const val = max * (1 - i / gridLines);
        return (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={VIEWBOX_WIDTH - PADDING.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            {i > 0 && (
              <text
                x={PADDING.left - 4}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#94a3b8"
              >
                {formatValue(val)}
              </text>
            )}
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = max > 0 ? (d.value / max) * chartH : 0;
        const x = PADDING.left + gap * i + (gap - barWidth) / 2;
        const y = PADDING.top + chartH - barH;
        const delay = i * 0.06;

        return (
          <g key={i}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill={color}
              opacity={0.85}
              className={`bar-animated-${uid.replace(/:/g, '')}`}
              style={{ animationDelay: `${delay}s` }}
            />

            {/* Value label on top */}
            {barH > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight="700"
                fill={color}
              >
                {formatValue(d.value)}
              </text>
            )}

            {/* X-axis label */}
            <text
              x={x + barWidth / 2}
              y={PADDING.top + chartH + 20}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* X-axis baseline */}
      <line
        x1={PADDING.left}
        y1={PADDING.top + chartH}
        x2={VIEWBOX_WIDTH - PADDING.right}
        y2={PADDING.top + chartH}
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />
    </svg>
  );
}
