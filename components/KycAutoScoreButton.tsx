'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import type { KycScoreResult } from '@/lib/kyc-score';

interface Props {
  kycId: string;
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600',
  B: 'text-navy-600',
  C: 'text-amber-600',
  D: 'text-red-600',
};

const DECISION_JA: Record<string, string> = {
  approved: '自動承認',
  manual_review: '手動審査が必要',
  rejected: '自動却下',
};

const DECISION_BG: Record<string, string> = {
  approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  manual_review: 'bg-amber-50 border-amber-200 text-amber-700',
  rejected: 'bg-red-50 border-red-200 text-red-700',
};

export function KycAutoScoreButton({ kycId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(KycScoreResult & { kyc_id: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAutoScore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kyc/auto-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kyc_id: kycId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data as KycScoreResult & { kyc_id: string });
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const gradeColor = GRADE_COLOR[result.grade] ?? 'text-slate-600';
    const decisionBg = DECISION_BG[result.autoDecision] ?? 'bg-slate-50 border-slate-200 text-slate-700';
    return (
      <div className={`rounded-lg border px-3 py-2 text-sm ${decisionBg}`}>
        <p className="font-bold">
          スコア: <span className={`font-black ${gradeColor}`}>{result.score}</span>
          <span className="ml-1 text-xs">({result.grade}級)</span>
          <span className="ml-2">{DECISION_JA[result.autoDecision] ?? result.autoDecision}</span>
        </p>
        {result.reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs opacity-80">
            {result.reasons.map((r, i) => <li key={i}>・{r}</li>)}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleAutoScore}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg bg-navy-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700 disabled:opacity-50"
      >
        <Zap className="h-3.5 w-3.5" />
        {loading ? '自動審査中…' : '自動審査'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
