'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Loader2, X } from 'lucide-react';
import { submitReport, REPORT_REASONS } from '@/app/reports/actions';
import type { ReportTarget } from '@/lib/types';

export function ReportDialog({
  targetType,
  targetId,
  loggedIn,
  label = '通報する',
}: {
  targetType: ReportTarget;
  targetId: string;
  loggedIn: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function openDialog() {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    setOpen(true);
  }

  async function send() {
    setBusy(true);
    setError(null);
    const res = await submitReport({ targetType, targetId, reason, detail });
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else {
      setDone(true);
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={openDialog} className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500">
        <Flag className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black">{targetType === 'listing' ? '出品' : targetType === 'user' ? 'ユーザー' : 'レビュー'}を通報</h2>
              <button onClick={() => !busy && setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {done ? (
              <div className="py-4 text-center">
                <p className="font-bold text-emerald-600">通報を受け付けました。</p>
                <p className="mt-1 text-sm text-slate-500">運営で内容を確認します。ご協力ありがとうございます。</p>
                <button onClick={() => setOpen(false)} className="btn-primary mt-4">閉じる</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">理由</label>
                  <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">詳細（任意）</label>
                  <textarea className="input" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="具体的な状況をご記入ください" />
                </div>
                {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="btn-outline" disabled={busy}>キャンセル</button>
                  <button onClick={send} className="btn-accent" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} 通報する
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
