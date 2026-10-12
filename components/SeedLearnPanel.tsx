'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { seedLearningContents } from '@/app/admin/learn/actions';

/** 追加講座を一括投入するボタン（SQL不要）。既存slugはスキップ。 */
export function SeedLearnPanel() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-bold text-navy-800">
          <Sparkles className="h-4 w-4 text-accent-500" /> 追加講座をまとめて投入
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          BUYMOとは／情報案件／オークション出品／クレーム対応ほか12本。登録済みの講座はスキップします。
        </p>
        {msg && <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="h-3.5 w-3.5" />{msg}</p>}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const r = await seedLearningContents();
            if (!r) setMsg('権限がありません。');
            else setMsg(`投入 ${r.inserted} 件 / スキップ ${r.skipped} 件`);
          })
        }
        className="btn-accent shrink-0 disabled:opacity-60"
      >
        {pending ? '投入中…' : '一括投入する'}
      </button>
    </div>
  );
}
