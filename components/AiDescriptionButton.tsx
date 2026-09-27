'use client';

import { useState } from 'react';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';

interface Props {
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  condition: string;
  /** 現在の説明文（添削に使用） */
  currentText?: string;
  onGenerated: (s: string) => void;
}

export function AiDescriptionButton({
  maker, model, year, mileage_km, condition, currentText = '', onGenerated,
}: Props) {
  const [loading, setLoading] = useState<null | 'generate' | 'polish'>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(mode: 'generate' | 'polish') {
    setLoading(mode);
    setError(null);
    setNote(null);
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'polish'
            ? { mode: 'polish', kind: 'vehicle', text: currentText }
            : { mode: 'generate', maker, model, year, mileage_km, condition }
        ),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? '処理に失敗しました');
      }
      const data = (await res.json()) as { description: string; ai?: boolean; note?: string };
      onGenerated(data.description);
      if (data.note) setNote(data.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : '処理に失敗しました');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => run('generate')}
          disabled={!!loading || !maker || !model}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-600 disabled:opacity-50"
          title="車両情報からAIが説明文を作成します"
        >
          {loading === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AIで作成
        </button>
        <button
          type="button"
          onClick={() => run('polish')}
          disabled={!!loading || currentText.trim().length < 5}
          className="flex items-center gap-1.5 rounded-lg border border-accent-500 px-3 py-1.5 text-xs font-bold text-accent-600 hover:bg-accent-50 disabled:opacity-40"
          title="今の文章をAIが自然な日本語に添削します"
        >
          {loading === 'polish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          AIで添削
        </button>
      </div>
      {note && <p className="mt-1 text-[11px] text-slate-400">{note}</p>}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
