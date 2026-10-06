import { TrendingDown, Minus, TrendingUp } from 'lucide-react';

function man(yen: number): string {
  const m = Math.abs(yen) / 10000;
  const s = m >= 100 ? Math.round(m).toLocaleString('ja-JP') : (Math.round(m * 10) / 10).toLocaleString('ja-JP');
  return `${s}万円`;
}

/**
 * 相場に対する価格評価（買い手向け）。同条件の他の現役出品の中央値と比較。
 * ±10%を「相場どおり」、10%以上安い=お得、10%以上高い=やや高め。
 */
export function PriceAssessment({ price, median, sample }: { price: number; median: number; sample: number }) {
  const diff = price - median;
  const ratio = diff / median;

  let tone: string;
  let Icon: typeof TrendingDown;
  let label: string;
  if (ratio <= -0.1) {
    tone = 'border-teal-200 bg-teal-50 text-teal-700';
    Icon = TrendingDown;
    label = `相場より ${man(diff)} お得`;
  } else if (ratio >= 0.1) {
    tone = 'border-amber-200 bg-amber-50 text-amber-700';
    Icon = TrendingUp;
    label = `相場より ${man(diff)} 高め`;
  } else {
    tone = 'border-slate-200 bg-slate-50 text-slate-600';
    Icon = Minus;
    label = '相場どおりの価格';
  }

  return (
    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span className="font-normal opacity-70">／ 同条件{sample}台の中央値 {man(median)}</span>
    </div>
  );
}
