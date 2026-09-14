'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { estimateInsurance, type InsurancePlan } from '@/lib/insurance';

interface Props {
  vehiclePrice: number;
  year: number;
  maker: string;
}

const NO_ACCIDENT_OPTIONS = [
  { value: 0, label: '0年（初めて／事故歴あり）' },
  { value: 1, label: '1年' },
  { value: 2, label: '2年' },
  { value: 3, label: '3年' },
  { value: 4, label: '4年' },
  { value: 5, label: '5年' },
  { value: 7, label: '7年' },
  { value: 10, label: '10年' },
  { value: 15, label: '15年' },
  { value: 20, label: '20年以上' },
];

function formatYen(n: number): string {
  return '¥' + n.toLocaleString('ja-JP');
}

export function InsuranceSimulator({ vehiclePrice, year, maker }: Props) {
  const [open, setOpen] = useState(false);
  const [age, setAge] = useState(30);
  const [yearsNoAccident, setYearsNoAccident] = useState(3);

  const plans: InsurancePlan[] = estimateInsurance({ vehiclePrice, year, maker, age, yearsNoAccident });

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-bold text-navy-800">
          <Shield className="h-5 w-5 text-blue-600" />
          保険料を試算する
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-5">
          {/* 入力フォーム */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ins-age" className="block text-xs font-bold text-slate-600 mb-1">
                運転者年齢
              </label>
              <input
                id="ins-age"
                type="number"
                min={18}
                max={80}
                value={age}
                onChange={(e) => setAge(Math.min(80, Math.max(18, Number(e.target.value))))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="mt-0.5 text-xs text-slate-400">18〜80歳</p>
            </div>
            <div>
              <label htmlFor="ins-no-accident" className="block text-xs font-bold text-slate-600 mb-1">
                無事故年数
              </label>
              <select
                id="ins-no-accident"
                value={yearsNoAccident}
                onChange={(e) => setYearsNoAccident(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {NO_ACCIDENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* プランカード */}
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.company}
                className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white hover:shadow-sm transition-shadow"
              >
                <div>
                  <p className="text-xs font-bold text-blue-600">{plan.company}</p>
                  <p className="text-sm font-bold text-navy-800 leading-snug mt-0.5">{plan.planName}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <p className="text-xs text-slate-500">年払い</p>
                  <p className="text-lg font-black text-navy-700">{formatYen(plan.annualPremium)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    月々 <span className="font-bold text-navy-600">{formatYen(plan.monthlyPremium)}</span>
                  </p>
                </div>

                <ul className="space-y-1">
                  {plan.coverage.map((c) => (
                    <li key={c} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      {c}
                    </li>
                  ))}
                </ul>

                {plan.features.length > 0 && (
                  <ul className="space-y-1 border-t border-slate-100 pt-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                <a
                  href="#"
                  className="block w-full rounded-lg border border-blue-200 py-1.5 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  詳細を見る
                </a>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            ※ 試算値です。正確な保険料は各社にお問い合わせください。
          </p>
        </div>
      )}
    </div>
  );
}
