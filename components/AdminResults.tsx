'use client';

import { useState } from 'react';
import { Loader2, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Images, ExternalLink, Info } from 'lucide-react';

type Scene = { key: string; label: string };
type Row = { status: 'idle' | 'busy' | 'done' | 'err'; url: string | null; error?: string };

export function AdminResults({ scenes, initial, aiOn }: { scenes: Scene[]; initial: Record<string, string>; aiOn: boolean }) {
  const [rows, setRows] = useState<Record<string, Row>>(
    () => Object.fromEntries(scenes.map((s) => [s.key, { status: 'idle', url: initial[s.key] ?? null }])),
  );
  const [bulk, setBulk] = useState(false);
  const [done, setDone] = useState(0);
  const [ranOnce, setRanOnce] = useState(false);

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
    setRanOnce(true);
  }

  const haveCount = scenes.filter((s) => rows[s.key].url).length;
  const errCount = scenes.filter((s) => rows[s.key].status === 'err').length;
  const pct = Math.round((done / scenes.length) * 100);

  return (
    <div className="space-y-4">
      {/* ── かんたんガイド（初めての方へ） ── */}
      <div className="rounded-[18px] border border-accent-200 bg-accent-50/60 p-5">
        <h2 className="flex items-center gap-2 text-base font-black text-navy-800">
          <Info className="h-5 w-5 text-accent-600" /> かんたんガイド（初めての方へ）
        </h2>
        <ol className="mt-3 space-y-2.5">
          {[
            ['下の「✨ 全部まとめて生成」ボタンを 1回だけ 押します。', 'ボタンはこのすぐ下にあります。'],
            ['AIが写真を自動で作ります（全部で ' + scenes.length + ' 枚・1〜数分）。', 'このまま画面を開いたままお待ちください。'],
            ['「' + scenes.length + '/' + scenes.length + '」になったら完了です。', 'トップページの「ご利用実績」に自動で表示されます（3枚以上で表示開始）。'],
          ].map(([t, sub], i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-600 text-xs font-black text-white">{i + 1}</span>
              <span className="text-sm">
                <span className="font-bold text-navy-800">{t}</span>
                <span className="block text-xs text-slate-500">{sub}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-accent-200 pt-3 text-xs text-slate-600">
          <span className="font-bold text-slate-700">⚠️ 気をつけること：</span>
          <span>・生成中はページを閉じない（止まります）</span>
          <span>・気に入らない写真は各カードの「再生成」で作り直せます</span>
        </div>
      </div>

      {/* ── 生成パネル ── */}
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
        </p>

        {/* 進捗バー（生成中） */}
        {bulk && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold text-accent-700">
              <span>生成中… しばらくお待ちください</span>
              <span>{done}/{scenes.length}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-100">
              <div className="h-full rounded-full bg-accent-600 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* 完了バナー */}
        {ranOnce && !bulk && (
          errCount === 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 生成が完了しました（{haveCount}/{scenes.length}）。トップに表示されます。</span>
              <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
                トップページで確認 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
              <span className="inline-flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> {haveCount}/{scenes.length} 枚できました。{errCount}枚だけ失敗しています。</span>
              <span className="mt-1 block text-xs font-normal text-amber-700">失敗したカードの「生成」ボタンをもう一度押してください（混雑による一時的な失敗が多いです）。</span>
            </div>
          )
        )}

        {!aiOn && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
            いまは画像を作れません（AIキー未設定）。本部の担当者に「<span className="font-black">OPENROUTER_API_KEY の設定</span>」を依頼してください。設定後はこのボタンが押せるようになります。
          </div>
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

        {/* 状態の見方 */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="font-bold text-slate-600">状態の見方：</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" />生成済＝できた</span>
          <span className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-600" />失敗＝もう一度「生成」を押す</span>
          <span className="inline-flex items-center gap-1"><Images className="h-3 w-3 text-slate-400" />未生成＝まだ</span>
        </div>
      </div>
    </div>
  );
}
