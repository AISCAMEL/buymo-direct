'use client';

import { useState } from 'react';
import { formatYen } from '@/lib/format';
import { LOAN_TERMS, simulateLoan } from '@/lib/loan';

/**
 * ローン返済シミュレーション。年率 aprFrom（最低年率）で月々の支払い例を計算。
 * 頭金・ボーナス併用に対応。実際の適用金利は審査で決定されるため「目安」表示。
 */
export function LoanSimulator({ principal, aprFrom }: { principal: number; aprFrom: number }) {
  const [months, setMonths] = useState(36);
  const [downPayment, setDownPayment] = useState(0);
  const [bonusPrincipal, setBonusPrincipal] = useState(0);

  const plan = simulateLoan({ price: principal, downPayment, bonusPrincipal, aprPercent: aprFrom, months });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="font-bold text-slate-700">支払回数</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold focus:border-navy-400 focus:outline-none"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {LOAN_TERMS.map((m) => (
              <option key={m} value={m}>{m}回（{Math.round((m / 12) * 10) / 10}年）</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-bold text-slate-700">頭金（円）</span>
          <input
            type="number" min={0} max={principal} step={10000}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-navy-400 focus:outline-none"
            value={downPayment || ''}
            onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))}
            placeholder="0"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="font-bold text-slate-700">ボーナス加算元金（円・半年ごと）</span>
        <input
          type="number" min={0} max={plan.financed} step={10000}
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-navy-400 focus:outline-none disabled:bg-slate-100"
          value={bonusPrincipal || ''}
          onChange={(e) => setBonusPrincipal(Math.max(0, Number(e.target.value)))}
          disabled={plan.bonusCount === 0}
          placeholder={plan.bonusCount === 0 ? 'この回数ではボーナス払い不可' : '0'}
        />
      </label>

      <div className="rounded-lg bg-white p-3 text-center">
        <p className="text-xs text-slate-500">月々のお支払い（目安）</p>
        <p className="text-2xl font-black text-navy-600">
          {formatYen(plan.monthly)}<span className="text-sm font-bold">/月</span>
        </p>
        {plan.bonus > 0 && (
          <p className="text-xs font-bold text-navy-500">＋ ボーナス月 {formatYen(plan.bonus)}（年2回）</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          融資額 {formatYen(plan.financed)} ／ 総支払 {formatYen(plan.total)}（うち金利 {formatYen(plan.interest)}）
        </p>
      </div>

      <p className="text-[11px] leading-snug text-slate-400">
        ※ 元利均等・最低年率{aprFrom}%での試算です。実際の金利・月額は審査により決定します。
        元金 {formatYen(principal)}（現金価格）から頭金を差し引いた額を融資対象とした概算です。
      </p>
    </div>
  );
}
