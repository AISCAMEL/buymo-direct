'use client';

import { useState, useTransition } from 'react';
import { Database, Trash2, Loader2 } from 'lucide-react';
import { seedDemoData, clearDemoData } from '@/app/admin/seed/actions';

export function SeedDemoPanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [mode, setMode] = useState<'seed' | 'clear' | null>(null);

  function run(kind: 'seed' | 'clear') {
    setMode(kind);
    startTransition(async () => {
      const r = kind === 'seed' ? await seedDemoData() : await clearDemoData();
      setResult(r);
      setMode(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => run('seed')}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {pending && mode === 'seed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          デモデータを投入（再実行で最新化）
        </button>
        <button
          onClick={() => run('clear')}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {pending && mode === 'clear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          デモデータを削除
        </button>
      </div>

      {result && (
        <pre className={`whitespace-pre-wrap rounded-lg border p-4 text-sm ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {result.message}
        </pre>
      )}
    </div>
  );
}
