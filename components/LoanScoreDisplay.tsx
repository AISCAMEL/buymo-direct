'use client';

import { formatYen } from '@/lib/format';
import type { LoanScoreResult } from '@/lib/loan-score';

interface Props {
  score: LoanScoreResult;
  monthlyPayment: number;
}

const DECISION_JA: Record<LoanScoreResult['autoDecision'], string> = {
  approved: '承認',
  conditional: '条件付き承認',
  manual_review: '審査中',
  rejected: '否決',
};

const DECISION_COLOR: Record<LoanScoreResult['autoDecision'], string> = {
  approved: 'text-emerald-600',
  conditional: 'text-amber-600',
  manual_review: 'text-navy-600',
  rejected: 'text-red-600',
};

const DECISION_BG: Record<LoanScoreResult['autoDecision'], string> = {
  approved: 'bg-emerald-50 border-emerald-200',
  conditional: 'bg-amber-50 border-amber-200',
  manual_review: 'bg-navy-50 border-navy-200',
  rejected: 'bg-red-50 border-red-200',
};

const GRADE_COLOR: Record<LoanScoreResult['grade'], string> = {
  A: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  B: 'bg-navy-100 text-navy-700 ring-navy-200',
  C: 'bg-amber-100 text-amber-700 ring-amber-300',
  D: 'bg-red-100 text-red-700 ring-red-300',
};

// SVG gauge: circle with stroke-dasharray trick
function ScoreGauge({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // Only fill 3/4 of the circle (270°) for a gauge look
  const arcLength = circumference * 0.75;
  const filled = (value / 100) * arcLength;
  const gap = circumference - arcLength;

  // Color based on score
  const strokeColor =
    value >= 70 ? '#14B8A6' // mint
    : value >= 50 ? '#0F766E' // navy
    : value >= 30 ? '#f59e0b' // amber
    : '#ef4444'; // red

  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" aria-label={`スコア ${value}`}>
      {/* Background arc */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="10"
        strokeDasharray={`${arcLength} ${gap}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
      />
      {/* Value arc */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="10"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Score text */}
      <text x="50" y="48" textAnchor="middle" dominantBaseline="middle" className="font-black" style={{ fontSize: 22, fontWeight: 900, fill: strokeColor }}>
        {value}
      </text>
      <text x="50" y="64" textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>
        / 100
      </text>
    </svg>
  );
}

export function LoanScoreDisplay({ score, monthlyPayment }: Props) {
  const decisionText = DECISION_JA[score.autoDecision];
  const decisionColor = DECISION_COLOR[score.autoDecision];
  const decisionBg = DECISION_BG[score.autoDecision];
  const gradeColor = GRADE_COLOR[score.grade];

  return (
    <div className="space-y-4">
      {/* Score + Grade header */}
      <div className="flex items-center gap-6">
        <ScoreGauge value={score.score} />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center h-9 w-9 rounded-full text-lg font-black ring-2 ${gradeColor}`}>
              {score.grade}
            </span>
            <span className="text-sm text-slate-500">グレード</span>
          </div>
          <div>
            <span className={`text-xl font-black ${decisionColor}`}>
              {decisionText}
            </span>
          </div>
          {score.recommendedRate > 0 && (
            <p className="text-sm text-slate-500">
              推奨金利: <span className="font-bold text-navy-700">{score.recommendedRate}%</span>
            </p>
          )}
        </div>
      </div>

      {/* Decision banner */}
      <div className={`rounded-lg border px-4 py-3 text-sm ${decisionBg}`}>
        <p className={`font-bold ${decisionColor}`}>
          {score.autoDecision === 'approved' && '仮審査の結果、承認されました。正式申込に進んでください。'}
          {score.autoDecision === 'conditional' && '条件付きで承認可能です。下記の条件をご確認ください。'}
          {score.autoDecision === 'manual_review' && '詳細審査が必要です。担当者より連絡いたします。'}
          {score.autoDecision === 'rejected' && '現在の条件では融資が困難です。頭金の増額等をご検討ください。'}
        </p>
      </div>

      {/* Monthly payment */}
      {monthlyPayment > 0 && score.autoDecision !== 'rejected' && (
        <div className="rounded-xl bg-navy-50 px-5 py-4 text-center">
          <p className="text-sm text-slate-500">推定月々のお支払い</p>
          <p className="mt-1 text-3xl font-black text-navy-700">
            {formatYen(monthlyPayment)}<span className="text-base font-normal">/月</span>
          </p>
          {score.maxApprovalAmount > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              最大融資可能額: {formatYen(score.maxApprovalAmount)}
            </p>
          )}
        </div>
      )}

      {/* Conditions */}
      {score.conditions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">審査条件</p>
          <ul className="space-y-1">
            {score.conditions.map((cond, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">!</span>
                {cond}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-400">
        ※ こちらはシミュレーション結果です。実際の審査結果は金融機関によって異なります。
      </p>
    </div>
  );
}
