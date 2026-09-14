'use client';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

const PADDING = { top: 32, right: 24, bottom: 44, left: 16 };
const VIEWBOX_WIDTH = 600;

function cubicBezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

export default function LineChart({
  data,
  height = 220,
  color = '#3b82f6',
  formatValue = (v) => v.toLocaleString('ja-JP'),
}: LineChartProps) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;

  const chartW = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const toX = (i: number) =>
    PADDING.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) =>
    PADDING.top + chartH - ((v - min) / range) * chartH;

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  const linePath = cubicBezierPath(points);

  // Area path: line path + close to bottom
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PADDING.top + chartH}` +
    ` L ${points[0].x} ${PADDING.top + chartH} Z`;

  const gridLines = 4;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      style={{ display: 'block' }}
      aria-label="折れ線グラフ"
      role="img"
    >
      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const y = PADDING.top + (chartH / gridLines) * i;
        const val = max - ((max - min) / gridLines) * i;
        return (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={VIEWBOX_WIDTH - PADDING.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={i === 0 ? undefined : '4 3'}
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

      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.12} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points + tooltips */}
      {points.map((pt, i) => (
        <g key={i}>
          {/* Halo for hover area */}
          <circle cx={pt.x} cy={pt.y} r={12} fill="transparent">
            <title>{`${data[i].label}: ${formatValue(data[i].value)}`}</title>
          </circle>
          {/* Visible dot */}
          <circle
            cx={pt.x}
            cy={pt.y}
            r={5}
            fill="white"
            stroke={color}
            strokeWidth={2.5}
          />
          {/* X-axis label */}
          <text
            x={pt.x}
            y={PADDING.top + chartH + 20}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
          >
            {data[i].label}
          </text>
        </g>
      ))}

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
