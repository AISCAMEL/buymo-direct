'use client';

import { useState } from 'react';
import { Loader2, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Shapes, ExternalLink } from 'lucide-react';

type Item = { key: string; label: string };
type Row = { status: 'idle' | 'busy' | 'done' | 'err'; url: string | null; error?: string };

export function AdminGenreIcons({ items, initial, aiOn }: { items: Item[]; initial: Record<string, string>; aiOn: boolean }) {
  const [rows, setRows] = useState<Record<string, Row>>(
    () => Object.fromEntries(items.map((s) => [s.key, { status: 'idle', url: initial[s.key] ?? null }])),
  );
  const [bulk, setBulk] = useState(false);
  const [done, setDone] = useState(0);
  const [ranOnce, setRanOnce] = useState(false);

  async function genOne(index: number): Promise<boolean> {
    const key = items[index].key;
    setRows((r) => ({ ...r, [key]: { ...r[key], status: 'busy', error: undefined } }));
    try {
      const res = await fetch('/api/admin/genre-icons-generate', {
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
    // 先頭（スタイル基準）を先に作ってから残りを順に（参照画像で統一）
    for (let i = 0; i < items.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await genOne(i);
      setDone((n) => n + 1);
    }
    setBulk(false);
    setRanOnce(true);
  }

  const haveCount = items.filter((s) => rows[s.key].url).length;
  const errCount = items.filter((s) => rows[s.key].status === 'err').length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-accent-200 bg-accent-50/60 p-5 text-sm">
        <h2 className="flex items-center gap-2 text-base font-black text-navy-800">
          <Shapes className="h-5 w-5 text-accent-600" /> ジャンルアイコンをまとめて生成
        </h2>
        <p className="mt-2 text-slate-600">
          「車種・ジャンルから探す」のアイコンをAIで統一スタイル（フラット・ティール系）で生成します。
          1枚目を基準に残りを揃えます。生成したジャンルは自動でアイコン表示に、未生成は既定のアイコンのままです。
        </p>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold">
            <Shapes className="h-5 w-5 text-accent-600" /> アイコン（{haveCount}/{items.length}）
          </h2>
          <button onClick={genAll} disabled={bulk || !aiOn} className="btn-accent text-sm disabled:opacity-50">
            {bulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 全部まとめて生成
          </button>
        </div>

        {bulk && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold text-accent-700">
              <span>生成中… しばらくお待ちください</span>
              <span>{done}/{items.length}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-100">
              <div className="h-full rounded-full bg-accent-600 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {ranOnce && !bulk && (
          errCount === 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 生成が完了しました（{haveCount}/{items.length}）。トップに反映されます。</span>
              <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
                トップで確認 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
              <span className="inline-flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> {haveCount}/{items.length} 枚できました。{errCount}枚だけ失敗しています。失敗したカードの「生成」を押し直してください。</span>
            </div>
          )
        )}

        {!aiOn && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
            いまは画像を作れません（AIキー未設定）。本部の担当者に「OPENROUTER_API_KEY の設定」を依頼してください。
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((s, i) => {
            const row = rows[s.key];
            return (
              <div key={s.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative aspect-square bg-gradient-to-br from-accent-50 to-[#F5F9F8]">
                  {row.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.url} alt={s.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Shapes className="h-7 w-7" />
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
    </div>
  );
}
