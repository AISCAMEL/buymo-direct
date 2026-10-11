'use client';

import { useState } from 'react';
import { Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { reportAuction } from '@/app/parts/actions';

const REASONS = [
  { value: 'prohibited', label: '禁止・違法な出品物' },
  { value: 'fake', label: '偽物・説明と違う' },
  { value: 'shill', label: '不正な価格の吊り上げ' },
  { value: 'other', label: 'その他' },
];

export function PartReportButton({ auctionId }: { auctionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('prohibited');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null); setSending(true);
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    fd.set('reason', reason);
    fd.set('note', note.trim());
    const res = await reportAuction(fd);
    setSending(false);
    if (res && !res.ok) { setError(res.error ?? '送信に失敗しました'); return; }
    setDone(true);
  }

  if (done) {
    return <p className="flex items-center justify-center gap-1 text-xs text-slate-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 通報を受け付けました。ご協力ありがとうございます。</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mx-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500">
        <Flag className="h-3.5 w-3.5" /> この出品を通報
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-bold text-slate-700">通報理由</p>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
        {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="補足（任意）" className="input" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500">キャンセル</button>
        <button onClick={submit} disabled={sending} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : '通報する'}
        </button>
      </div>
    </div>
  );
}
