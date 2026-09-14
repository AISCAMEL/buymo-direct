'use client';

import { useState } from 'react';
import { Calculator, TrendingDown } from 'lucide-react';
import { MAKERS, PREFECTURES } from '@/lib/constants';
import { formatYen } from '@/lib/format';

const MAKER_BASE_PRICE: Record<string, number> = {
  レクサス: 5500000, 輸入車: 4200000, トヨタ: 2800000, ホンダ: 2400000,
  日産: 2200000, マツダ: 2200000, スバル: 2300000, 三菱: 2000000,
  スズキ: 1300000, ダイハツ: 1200000, その他: 2000000,
};

function estimate(maker: string, year: number, mileageKm: number, condition: string) {
  const base = MAKER_BASE_PRICE[maker] ?? 2000000;
  const age = new Date().getFullYear() - year;

  // 年次減価
  let residual = 1.0;
  for (let i = 0; i < age; i++) {
    const rate = i < 3 ? 0.18 : i < 6 ? 0.12 : 0.08;
    residual *= (1 - rate);
  }

  // 走行距離係数（15000km/年を基準）
  const stdMileage = age * 15000;
  const excessKm = Math.max(0, mileageKm - stdMileage);
  const mileageFactor = Math.max(0.4, 1 - excessKm * 0.000008);

  // コンディション係数
  const condFactor = { excellent: 1.15, good: 1.0, fair: 0.82 }[condition] ?? 1.0;

  const est = base * residual * mileageFactor * condFactor;
  const lower = Math.round(est * 0.85 / 10000) * 10000;
  const upper = Math.round(est * 1.15 / 10000) * 10000;

  return { lower: Math.max(50000, lower), upper: Math.max(100000, upper), est: Math.round(est) };
}

export default function ValuationPage() {
  const [maker, setMaker] = useState('');
  const [year, setYear] = useState(new Date().getFullYear() - 5);
  const [mileage, setMileage] = useState(50000);
  const [condition, setCondition] = useState('good');
  const [result, setResult] = useState<{ lower: number; upper: number; est: number } | null>(null);

  function calc(e: React.FormEvent) {
    e.preventDefault();
    if (!maker) return;
    setResult(estimate(maker, year, mileage, condition));
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">車両査定ツール</h1>
      </div>

      <div className="card p-5">
        <p className="mb-4 text-sm text-slate-500">
          メーカー・年式・走行距離から市場相場の目安を算出します。
          実際の売却価格は車両状態・需給により異なります。
        </p>

        <form onSubmit={calc} className="space-y-4">
          <div>
            <label className="label">メーカー *</label>
            <select required className="input" value={maker} onChange={(e) => setMaker(e.target.value)}>
              <option value="">選択してください</option>
              {Object.keys(MAKERS).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">年式</label>
              <input type="number" min={1990} max={currentYear} className="input"
                value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">走行距離(km)</label>
              <input type="number" min={0} className="input"
                value={mileage} onChange={(e) => setMileage(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="label">車両コンディション</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'excellent', label: '優良', desc: '無事故・低走行' },
                { value: 'good', label: '良好', desc: '一般的な状態' },
                { value: 'fair', label: '普通', desc: '多少の傷・使用感あり' },
              ].map((c) => (
                <label key={c.value} className={`cursor-pointer rounded-lg border p-3 text-center transition ${condition === c.value ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" className="sr-only" value={c.value} checked={condition === c.value} onChange={() => setCondition(c.value)} />
                  <p className="text-sm font-bold">{c.label}</p>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-accent w-full">
            <Calculator className="h-4 w-4" /> 査定額を計算する
          </button>
        </form>
      </div>

      {result && (
        <div className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <TrendingDown className="h-5 w-5 text-navy-500" /> 査定結果
          </h2>

          <div className="rounded-xl bg-navy-50 p-5 text-center">
            <p className="text-sm text-slate-500">推定相場レンジ</p>
            <p className="mt-1 text-3xl font-black text-navy-700">
              {formatYen(result.lower)} 〜 {formatYen(result.upper)}
            </p>
            <p className="mt-1 text-sm text-slate-400">中央値：{formatYen(result.est)}</p>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            ※ この査定額は簡易計算による目安です。実際の市場価格は車両状態・オプション・地域の需給等により大きく異なります。
            正確な査定は専門業者にご依頼ください。
          </div>

          <a href={`/listings?maker=${encodeURIComponent(maker)}&year_min=${year - 1}&year_max=${year + 1}`}
            className="btn-outline block text-center text-sm">
            {maker} {year}年の出品を探す →
          </a>
        </div>
      )}
    </div>
  );
}
