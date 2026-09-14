'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Flag, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { Report, ReportStatus, ReportTarget } from '@/lib/types';

type ReportWithReporter = Report & { reporter?: { display_name: string } };

const STATUS_NEXT: { status: ReportStatus; label: string; cls: string }[] = [
  { status: 'reviewing', label: '確認中にする', cls: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { status: 'resolved', label: '対応済み', cls: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'dismissed', label: '却下', cls: 'border-slate-300 text-slate-600 hover:bg-slate-50' },
];
const STATUS_LABEL: Record<ReportStatus, string> = {
  open: '未対応',
  reviewing: '確認中',
  resolved: '対応済み',
  dismissed: '却下',
};
const STATUS_CLS: Record<ReportStatus, string> = {
  open: 'bg-red-100 text-red-700',
  reviewing: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-slate-100 text-slate-500',
};
const STATUS_ICON: Record<ReportStatus, React.ElementType> = {
  open: AlertTriangle,
  reviewing: Clock,
  resolved: CheckCircle2,
  dismissed: XCircle,
};
const TARGET_LABEL: Record<ReportTarget, string> = { listing: '出品', user: 'ユーザー', review: 'レビュー' };

const DEMO_REPORTS: ReportWithReporter[] = [
  {
    id: 'rpt-1',
    reporter_id: 'u-001',
    target_type: 'user',
    target_id: 'u-999',
    reason: '外部決済への誘導',
    detail: '「銀行振込で安くします」と言われてBUYMO外での取引を求められました。',
    status: 'open',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reporter: { display_name: '田中 圭一' },
  },
  {
    id: 'rpt-2',
    reporter_id: 'u-002',
    target_type: 'listing',
    target_id: 'lst-001',
    reason: '虚偽の車両情報',
    detail: '写真と実車が全く異なる。走行距離も改ざんされているようです。',
    status: 'reviewing',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    reporter: { display_name: '佐藤 由美' },
  },
  {
    id: 'rpt-3',
    reporter_id: 'u-003',
    target_type: 'user',
    target_id: 'u-998',
    reason: '詐欺・なりすましの疑い',
    detail: '送金後に連絡が取れなくなりました。詐欺の被害にあったと思います。',
    status: 'open',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    reporter: { display_name: '山田 健太' },
  },
  {
    id: 'rpt-4',
    reporter_id: 'u-004',
    target_type: 'review',
    target_id: 'rev-001',
    reason: '虚偽のレビュー',
    detail: 'この出品者のレビューは全て自作自演のように見えます。',
    status: 'resolved',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { display_name: '鈴木 花子' },
  },
  {
    id: 'rpt-5',
    reporter_id: 'u-005',
    target_type: 'listing',
    target_id: 'lst-002',
    reason: '不適切なコンテンツ',
    detail: '出品説明に不適切な表現が含まれています。',
    status: 'dismissed',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { display_name: '伊藤 良太' },
  },
];

function targetHref(type: ReportTarget, id: string): string | null {
  if (type === 'listing') return `/listings/${id}`;
  if (type === 'user') return `/users/${id}`;
  return null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithReporter[]>(DEMO_REPORTS);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const openCount = reports.filter(r => r.status === 'open').length;
  const reviewingCount = reports.filter(r => r.status === 'reviewing').length;

  function setStatus(id: string, status: ReportStatus) {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  return (
    <div className="space-y-5">
      {/* サマリー */}
      {openCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Flag className="h-4 w-4 text-red-600" />
          <p className="text-sm font-bold text-red-700">未対応の通報が {openCount} 件あります</p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">
        {(['all', 'open', 'reviewing', 'resolved'] as const).map(s => {
          const count = s === 'all' ? reports.length : reports.filter(r => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`card p-3 text-center transition ${filter === s ? 'ring-2 ring-navy-400' : ''}`}
            >
              <p className={`text-xl font-black ${s === 'open' && count > 0 ? 'text-red-600' : s === 'reviewing' && count > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {count}
              </p>
              <p className="text-xs text-slate-500">{s === 'all' ? '全件' : STATUS_LABEL[s as ReportStatus]}</p>
            </button>
          );
        })}
      </div>

      <h1 className="text-xl font-black">通報の管理（{filtered.length}）</h1>

      {filtered.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-500">通報はありません。</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const href = targetHref(r.target_type, r.target_id);
            const StatusIcon = STATUS_ICON[r.status];
            return (
              <li key={r.id} className={`card p-4 ${r.status === 'open' ? 'border-red-200' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      <span className="badge mr-2 bg-slate-100 text-slate-600">{TARGET_LABEL[r.target_type]}</span>
                      {r.reason}
                    </p>
                    {r.detail && <p className="mt-1 text-sm text-slate-600">{r.detail}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      通報者: {r.reporter?.display_name ?? '—'} ・ {formatDateTime(r.created_at)}
                      {href && (
                        <> ・ <Link href={href} className="font-bold text-navy-400 hover:underline">対象を見る</Link></>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge flex items-center gap-1 ${STATUS_CLS[r.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {STATUS_LABEL[r.status]}
                    </span>
                    <div className="flex gap-1">
                      {STATUS_NEXT.map((n) => (
                        <button
                          key={n.status}
                          onClick={() => setStatus(r.id, n.status)}
                          disabled={r.status === n.status}
                          className={`rounded-md border px-2 py-1 text-xs font-bold transition disabled:opacity-30 ${n.cls}`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
