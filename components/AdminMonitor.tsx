'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

type Severity = 'critical' | 'attention' | 'ok';
type Alert = { area: string; label: string; count: number | null; severity: Severity; href: string; hint: string };
type Report = {
  status: Severity;
  counts: { critical: number; attention: number };
  alerts: Alert[];
  aiSummary: string | null;
  aiEnabled: boolean;
  generatedAt: string;
};

const SEV = {
  critical: { ring: 'border-red-300 bg-red-50', dot: 'bg-red-500', text: 'text-red-700', chip: 'bg-red-600 text-white', label: '要対応' },
  attention: { ring: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-700', chip: 'bg-amber-500 text-white', label: '注意' },
  ok: { ring: 'border-slate-200 bg-white', dot: 'bg-emerald-500', text: 'text-emerald-700', chip: 'bg-emerald-500 text-white', label: '正常' },
} as const;

function StatusBanner({ status, counts }: { status: Severity; counts: Report['counts'] }) {
  if (status === 'critical')
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
        <ShieldAlert className="h-7 w-7 shrink-0 text-red-600" />
        <div>
          <p className="font-black text-red-700">要対応があります</p>
          <p className="text-sm text-red-600/90">要対応 {counts.critical} 件・注意 {counts.attention} 件。下の赤い項目から着手してください。</p>
        </div>
      </div>
    );
  if (status === 'attention')
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <AlertTriangle className="h-7 w-7 shrink-0 text-amber-600" />
        <div>
          <p className="font-black text-amber-700">注意が必要な項目があります</p>
          <p className="text-sm text-amber-600/90">注意 {counts.attention} 件。滞留しないうちに対応を。</p>
        </div>
      </div>
    );
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
      <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />
      <div>
        <p className="font-black text-emerald-700">おおむね正常です</p>
        <p className="text-sm text-emerald-600/90">しきい値を超える滞留はありません。引き続き監視します。</p>
      </div>
    </div>
  );
}

export function AdminMonitor({ initial }: { initial: Report }) {
  const [report, setReport] = useState<Report>(initial);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/monitor', { cache: 'no-store' });
      if (res.ok) setReport((await res.json()) as Report);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  const actionable = report.alerts.filter((a) => a.severity !== 'ok');
  const normal = report.alerts.filter((a) => a.severity === 'ok');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          点検時刻：{new Date(report.generatedAt).toLocaleString('ja-JP')}
        </p>
        <button onClick={refresh} disabled={busy} className="btn-outline px-4 py-2 text-sm disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 再点検
        </button>
      </div>

      <StatusBanner status={report.status} counts={report.counts} />

      {/* AI要約 */}
      {report.aiEnabled ? (
        report.aiSummary && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-accent-700">
              <Sparkles className="h-4 w-4" /> AIの見立てと次アクション
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-800">{report.aiSummary}</p>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          ANTHROPIC_API_KEY 未設定のため、AIの要約は省略（件数監視は動作中）。
        </div>
      )}

      {/* 要対応・注意 */}
      {actionable.length > 0 && (
        <div className="space-y-2.5">
          {actionable.map((a) => {
            const s = SEV[a.severity];
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`flex items-center gap-3 rounded-xl border p-3.5 transition hover:shadow-sm ${s.ring}`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${s.chip}`}>{s.label}</span>
                    <span className="text-[11px] font-bold text-slate-400">{a.area}</span>
                    <span className="truncate text-sm font-bold text-navy-800">{a.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{a.hint}</p>
                </div>
                <span className={`shrink-0 text-xl font-black ${s.text}`}>{a.count ?? '—'}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      )}

      {/* 正常キュー（折りたたみ） */}
      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-600">
          正常なキュー（{normal.length}） — 監視中
        </summary>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {normal.map((a) => (
            <Link key={a.label} href={a.href} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-slate-50">
              <span className="truncate text-slate-600">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
                {a.label}
              </span>
              <span className="shrink-0 font-bold text-slate-400">{a.count ?? '—'}</span>
            </Link>
          ))}
        </div>
      </details>

      <p className="text-xs text-slate-400">
        ※ 監視は各キューの「件数」のみを集計します。個人情報はAIに渡していません。しきい値を超えると要対応/注意として表示します。
      </p>
    </div>
  );
}
