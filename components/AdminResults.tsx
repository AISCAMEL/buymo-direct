'use client';

import { useState } from 'react';
import { Loader2, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Images } from 'lucide-react';

type Scene = { key: string; label: string };
type Row = { status: 'idle' | 'busy' | 'done' | 'err'; url: string | null; error?: string };

export function AdminResults({ scenes, initial, aiOn }: { scenes: Scene[]; initial: Record<string, string>; aiOn: boolean }) {
  const [rows, setRows] = useState<Record<string, Row>>(
    () => Object.fromEntries(scenes.map((s) => [s.key, { status: 'idle', url: initial[s.key] ?? null }])),
  );
  const [bulk, setBulk] = useState(false);
  const [done, setDone] = useState(0);

  async function genOne(index: number): Promise<boolean> {
    const key = scenes[index].key;
    setRows((r) => ({ ...r, [key]: { ...r[key], status: 'busy', error: undefined } }));
    try {
      const res = await fetch('/api/admin/results-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      const data = await res.json();
      if (data.ok) {
        setRows((r) => ({ ...r, [key]: { status: 'done', url: data.url } }));
        return true;
      }
      setRows((r) => ({ ...r, [key]: { ...r[key], status: 'err', error: data.error ?? '失敗' } }));
      return false;
    } catch {
      setRows((r) => ({ ...r, [key]: { ...r[key], status: 'err', error: '通信失敗' } }));
      return false;
    }
  }

  async function genAll() {
    setBulk(true);
    setDone(0);
    for (let i = 0; i < scenes.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await genOne(i);
      setDone((n) => n + 1);
    }
    setBulk(false);
  }

  const haveCount = scenes.filter((s) => rows[s.key].url).length;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Images className="h-5 w-5 text-accent-600" /> ご利用実績の画像（{haveCount}/{scenes.length}）
        </h2>
        <button onClick={genAll} disabled={bulk || !aiOn} className="btn-accent text-sm disabled:opacity-50">
          {bulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 全部まとめて生成
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        AIが実績シーンの画像を生成し、トップページの「ご利用実績」に自動表示します（3枚以上で表示開始）。
        {bulk && <span className="ml-1 font-bold text-accent-700">生成中… {done}/{scenes.length}</span>}
      </p>
      {!aiOn && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          OPENROUTER_API_KEY 未設定だと生成できません。
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {scenes.map((s, i) => {
          const row = rows[s.key];
          return (
            <div key={s.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative aspect-square bg-slate-100">
                {row.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.url} alt={s.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Images className="h-8 w-8" />
                  </div>
                )}
                {row.status === 'busy' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <Loader2 className="h-6 w-6 animate-spin text-accent-600" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-bold text-navy-800">{s.label}</p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  {row.status === 'done' ? (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> 生成済</span>
                  ) : row.status === 'err' ? (
                    <span className="inline-flex items-center gap-0.5 truncate text-[11px] font-bold text-red-600" title={row.error}><AlertCircle className="h-3 w-3" /> 失敗</span>
                  ) : (
                    <span className="text-[11px] text-slate-400">{row.url ? '生成済' : '未生成'}</span>
                  )}
                  <button
                    onClick={() => genOne(i)}
                    disabled={row.status === 'busy' || bulk || !aiOn}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" /> {row.url ? '再生成' : '生成'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
