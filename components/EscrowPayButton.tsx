'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatYen } from '@/lib/format';

export function EscrowPayButton({
  escrowId,
  amount,
  disabled,
}: {
  escrowId: string;
  amount: number;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrow_id: escrowId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? '決済リンクの生成に失敗しました');
      }
      if (!data.url) throw new Error('決済 URL が取得できませんでした');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : '決済リンクの生成に失敗しました');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="btn-accent flex w-full items-center justify-center gap-2 py-3 text-base"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? '決済ページに移動中…' : `Square で支払う（${formatYen(amount)}）`}
      </button>
      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
