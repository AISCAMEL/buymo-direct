'use client';

import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { calculateLoanScore } from '@/lib/loan-score';
import { monthlyPayment } from '@/lib/loan';
import { LoanScoreDisplay } from '@/components/LoanScoreDisplay';

const TERMS = [12, 24, 36, 48, 60, 84];

export function LoanScoreSimulator() {
  const [vehiclePrice, setVehiclePrice] = useState(2000000);
  const [downPayment, setDownPayment] = useState(200000);
  const [termMonths, setTermMonths] = useState(60);
  const [kycGrade, setKycGrade] = useState<'A' | 'B' | 'C' | 'D' | ''>('B');
  const [memberRank, setMemberRank] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('bronze');

  const { loanScore, monthly } = useMemo(() => {
    const grade = kycGrade !== '' ? kycGrade : null;
    const loanScore = calculateLoanScore({
      vehiclePrice,
      downPayment,
      termMonths,
      kycGrade: grade,
      priorDefaultCount: 0,
      memberRank,
    });
    const principal = Math.max(0, vehiclePrice - downPayment);
    const monthly = monthlyPayment(principal, loanScore.recommendedRate, termMonths);
    return { loanScore, monthly };
  }, [vehiclePrice, downPayment, termMonths, kycGrade, memberRank]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-navy-400" />
        <h3 className="font-bold">簡易審査シミュレーター</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">車両価格（円）</label>
          <input
            type="number"
            value={vehiclePrice}
            step="10000"
            min="0"
            onChange={e => setVehiclePrice(Number(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">頭金（円）</label>
          <input
            type="number"
            value={downPayment}
            step="10000"
            min="0"
            onChange={e => setDownPayment(Number(e.target.value))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">返済期間</label>
          <select
            value={termMonths}
            onChange={e => setTermMonths(Number(e.target.value))}
            className="input w-full"
          >
            {TERMS.map(t => (
              <option key={t} value={t}>{t}ヶ月（{t / 12}年）</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">KYCグレード（参考）</label>
          <select
            value={kycGrade}
            onChange={e => setKycGrade(e.target.value as 'A' | 'B' | 'C' | 'D' | '')}
            className="input w-full"
          >
            <option value="">未確認</option>
            <option value="A">A（最優良）</option>
            <option value="B">B（優良）</option>
            <option value="C">C（標準）</option>
            <option value="D">D（要審査）</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">会員ランク</label>
          <select
            value={memberRank}
            onChange={e => setMemberRank(e.target.value as 'bronze' | 'silver' | 'gold' | 'platinum')}
            className="input w-full"
          >
            <option value="bronze">ブロンズ</option>
            <option value="silver">シルバー</option>
            <option value="gold">ゴールド</option>
            <option value="platinum">プラチナ</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <LoanScoreDisplay score={loanScore} monthlyPayment={monthly} />
      </div>
    </div>
  );
}
