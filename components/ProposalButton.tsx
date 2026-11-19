'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, ClipboardList } from 'lucide-react';

// ヒアリング行から、査定表（展開図）も自動で突き合わせてAI最適提案を出すボタン。
export function ProposalButton({ hearingId }: { hearingId: string }) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [meta, setMeta] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/dealer/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hearingId }),
      });
      const data = (await res.json()) as { proposal?: string; matchedInspections?: number; error?: string };
      if (data.proposal) {
        setProposal(data.proposal);
        setMeta(data.matchedInspections ?? 0);
      } else {
        setErr(data.error ?? '提案を作成できませんでした');
      }
    } catch {
      setErr('通信に失敗しました。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!proposal) return;
    try { navigator.clipboard.writeText(proposal); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  }

  return (
    <div className="mt-2">
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent-300 bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-700 transition hover:bg-accent-100 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {proposal ? 'AI提案を作り直す' : 'AI最適提案（展開図＋商談を分析）'}
      </button>

      {err && <p className="mt-1.5 text-xs text-coral-600">{err}</p>}

      {proposal && (
        <div className="mt-2 rounded-xl border border-accent-200 bg-accent-50/50 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent-600" />
            <span className="text-xs font-black text-navy-800">AIの買取提案</span>
            <span className="text-[11px] text-slate-500">
              {meta ? `査定表${meta}件を参照` : '査定表の紐付けなし（ヒアリングのみ）'}
            </span>
            <button onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}コピー
            </button>
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{proposal}</p>
          <p className="mt-2 text-[10px] text-slate-400">※ AIによる目安です。最終的な提示額はご自身でご判断ください。</p>
        </div>
      )}
    </div>
  );
}
