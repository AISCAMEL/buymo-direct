'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, UserCheck } from 'lucide-react';
import { blockCounterparty, unblockCounterparty } from '@/app/messages/[id]/actions';

/** 会話の相手をブロック/解除するボタン（売り手が買い手をブロックなど）。 */
export function BlockButton({ conversationId, blocked }: { conversationId: string; blocked: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    setErr(null);
    if (!blocked && !window.confirm('この相手をブロックします。以後、メッセージの送受信ができなくなります。よろしいですか？')) return;
    start(async () => {
      const r = blocked ? await unblockCounterparty(conversationId) : await blockCounterparty(conversationId);
      if (r?.error) setErr(r.error);
      else router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${
          blocked
            ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
            : 'border-red-200 text-red-600 hover:bg-red-50'
        }`}
      >
        {blocked ? <><UserCheck className="h-3.5 w-3.5" />ブロックを解除</> : <><Ban className="h-3.5 w-3.5" />この相手をブロック</>}
      </button>
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </span>
  );
}
