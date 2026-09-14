'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  condition: string;
  onGenerated: (s: string) => void;
}

export function AiDescriptionButton({
  maker,
  model,
  year,
  mileage_km,
  condition,
  onGenerated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maker, model, year, mileage_km, condition }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? '生成に失敗しました');
      }
      const data = (await res.json()) as { description: string };
      onGenerated(data.description);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !maker || !model}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        AI説明文を生成
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
