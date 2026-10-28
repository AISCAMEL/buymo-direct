'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, History } from 'lucide-react';
import { formatDate } from '@/lib/format';
import {
  escrowEventsForRole, ESCROW_ROLE_LABEL,
  type EscrowEventRole, type EscrowEventType,
} from '@/lib/escrow-events';
import type { EscrowEventRow } from '@/lib/escrow-events-data';
import { postEscrowEvent } from '@/app/escrow/report-actions';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-navy-100 text-navy-700',
  seller: 'bg-gold-100 text-gold-700',
  buyer: 'bg-accent-100 text-accent-700',
};

export function EscrowTimeline({
  escrowId,
  events,
  viewerRole,
}: {
  escrowId: string;
  events: EscrowEventRow[];
  viewerRole: EscrowEventRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<EscrowEventType | null>(null);
  const [note, setNote] = useState('');
  const [eta, setEta] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = escrowEventsForRole(viewerRole);
  const selectedDef = options.find((d) => d.type === selected) ?? null;

  function submit() {
    if (!selectedDef) return;
    setError(null);
    const etaNum = selectedDef.hasEta && eta ? Number(eta) : null;
    startTransition(async () => {
      const res = await postEscrowEvent(escrowId, selectedDef.type, note || undefined, etaNum);
      if (res.error) { setError(res.error); return; }
      setSelected(null); setNote(''); setEta('');
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 font-bold text-navy-800">
        <History className="h-4 w-4 text-navy-500" /> 取引の進捗タイムライン
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        進捗を報告すると、相手の方へ通知・メールが届きます（{ESCROW_ROLE_LABEL[viewerRole]}として投稿）。
      </p>

      {/* 報告ボタン */}
      {options.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {options.map((d) => (
              <button
                key={d.type}
                type="button"
                onClick={() => { setSelected(selected === d.type ? null : d.type); setNote(''); setEta(''); setError(null); }}
                className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${selected === d.type ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {d.emoji} {d.label}
              </button>
            ))}
          </div>

          {selectedDef && (
            <div className="mt-2 rounded-xl border border-navy-200 bg-navy-50/50 p-3">
              <p className="mb-1.5 text-xs font-bold text-navy-700">{selectedDef.emoji} {selectedDef.label}</p>
              {selectedDef.hasEta && (
                <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                  到着まで
                  <input
                    type="number" min={1} max={60} inputMode="numeric"
                    value={eta} onChange={(e) => setEta(e.target.value)}
                    className="input h-8 w-20 text-sm" placeholder="例 5"
                  />
                  日（目安・任意）
                </label>
              )}
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)}
                rows={2} maxLength={1000}
                placeholder="補足メモ（任意）：追跡番号・受け渡し日時など"
                className="input text-sm"
              />
              {error && <p className="mt-1.5 rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{error}</p>}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button" onClick={submit} disabled={pending}
                  className="btn-accent inline-flex items-center gap-1.5 px-4 py-1.5 text-sm disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} この進捗を報告する
                </button>
                <button type="button" onClick={() => setSelected(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">キャンセル</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* タイムライン */}
      {events.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
          まだ進捗の報告はありません。上のボタンから報告できます。
        </p>
      ) : (
        <ol className="space-y-0">
          {events.map((ev, i) => (
            <li key={ev.id} className="flex gap-3">
              {/* 縦ライン */}
              <div className="flex flex-col items-center">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm">{ev.title.split(' ')[0]}</span>
                {i < events.length - 1 && <span className="my-0.5 w-0.5 flex-1 bg-slate-200" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-bold text-navy-800">{ev.title.replace(/^\S+\s/, '')}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ROLE_BADGE[ev.actor_role] ?? 'bg-slate-100 text-slate-500'}`}>
                    {ESCROW_ROLE_LABEL[(ev.actor_role as EscrowEventRole)] ?? ev.actor_role}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(ev.created_at)}</span>
                </div>
                {ev.meta?.etaDays ? <p className="mt-0.5 text-xs font-bold text-accent-600">到着予定：あと約{ev.meta.etaDays}日</p> : null}
                {ev.body ? <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{ev.body}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
