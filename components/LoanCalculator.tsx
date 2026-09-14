'use client';

import { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { formatYen } from '@/lib/format';

interface Props {
  initialPrice?: number;
  onApply?: (amount: number, months: number) => void;
}

const TERMS = [12, 24, 36, 48, 60, 84];

export function LoanCalculator({ initialPrice = 2000000, onApply }: Props) {
  const [price, setPrice] = useState(initialPrice);
  const [down, setDown] = useState(Math.round(initialPrice * 0.1));
  const [rate, setRate] = useState(3.9);
  const [months, setMonths] = useState(60);

  const result = useMemo(() => {
    const principal = Math.max(0, price - down);
    if (principal <= 0) return { monthly: 0, total: 0, interest: 0, principal: 0 };
    const r = rate / 100 / 12;
    const monthly = r === 0
      ? Math.round(principal / months)
      : Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
    const total = monthly * months;
    const interest = total - principal;
    return { monthly, total, interest, principal };
  }, [price, down, rate, months]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-navy-400" />
        <h3 className="font-bold">ローンシミュレーター</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">車両価格</label>
          <input
            type="number"
            value={price}
            step="10000"
            min="0"
            onChange={e => setPrice(Number(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">頭金</label>
          <input
            type="number"
            value={down}
            step="10000"
            min="0"
            onChange={e => setDown(Number(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">金利（年率 %）</label>
          <input
            type="number"
            value={rate}
            step="0.1"
            min="0.1"
            max="30"
            onChange={e => setRate(Number(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">返済期間</label>
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className="input w-full">
            {TERMS.map(t => <option key={t} value={t}>{t}ヶ月（{t / 12}年）</option>)}
          </select>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-xl bg-navy-50 p-5">
        <div className="text-center">
          <p className="text-sm text-slate-500">月々のお支払い（目安）</p>
          <p className="mt-1 text-4xl font-black text-navy-700">{formatYen(result.monthly)}<span className="text-lg font-normal">/月</span></p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="font-black text-navy-700">{formatYen(result.principal)}</p>
            <p className="text-xs text-slate-400">借入元金</p>
          </div>
          <div>
            <p className="font-black text-slate-600">{formatYen(result.interest)}</p>
            <p className="text-xs text-slate-400">利息合計</p>
          </div>
          <div>
            <p className="font-black text-slate-600">{formatYen(result.total)}</p>
            <p className="text-xs text-slate-400">総支払額</p>
          </div>
        </div>
      </div>

      {onApply && (
        <button
          onClick={() => onApply(result.principal, months)}
          className="btn-accent w-full"
          disabled={result.principal <= 0}
        >
          この条件で仮審査を申し込む
        </button>
      )}

      <p className="text-xs text-slate-400">※ 上記はあくまで目安です。実際の金利・審査結果は金融機関によって異なります。</p>
    </div>
  );
}
