'use client';

import { useState } from 'react';
import { Flag, CheckCircle2 } from 'lucide-react';

export function ReportButton({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    '外部決済への誘導',
    '詐欺・なりすましの疑い',
    '不審な個人情報の要求',
    '脅迫・ハラスメント',
    'その他',
  ];

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    // 実際はAPIを叩いて reports テーブルに保存
    await new Promise(r => setTimeout(r, 800));
    setDone(true);
    setOpen(false);
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> 本部に通報しました
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-red-300 hover:text-red-600 transition-colors"
      >
        <Flag className="h-3.5 w-3.5" /> 本部に通報
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
          onClick={() => !submitting && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-navy-800 mb-1">本部に通報する</h3>
            <p className="text-xs text-slate-500 mb-4">
              通報内容は本部スタッフのみが確認します。不正・詐欺・規約違反を発見した場合にご利用ください。
            </p>
            <div className="space-y-2 mb-4">
              {REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="reason" value={r} className="text-navy-700"
                    checked={reason === r} onChange={() => setReason(r)} />
                  <span className="text-sm text-slate-700">{r}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <button
                onClick={submit}
                disabled={!reason || submitting}
                className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {submitting ? '送信中...' : '通報する'}
              </button>
              <button onClick={() => setOpen(false)} disabled={submitting}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
