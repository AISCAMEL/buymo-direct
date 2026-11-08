'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, ExternalLink, Images, CheckCircle2, AlertCircle } from 'lucide-react';

type Col = { slug: string; title: string; cat: string; thumb_url: string | null; published_at: string };
type Row = { status: 'idle' | 'busy' | 'done' | 'err'; thumb: string | null; error?: string };

export function AdminReimage({ columns, aiOn }: { columns: Col[]; aiOn: boolean }) {
  const [rows, setRows] = useState<Record<string, Row>>(
    () => Object.fromEntries(columns.map((c) => [c.slug, { status: 'idle', thumb: c.thumb_url }])),
  );
  const [bulk, setBulk] = useState(false);
  const [done, setDone] = useState(0);

  async function reimage(slug: string): Promise<boolean> {
    setRows((r) => ({ ...r, [slug]: { ...r[slug], status: 'busy', error: undefined } }));
    try {
      const res = await fetch('/api/admin/reimage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (data.ok) {
        setRows((r) => ({ ...r, [slug]: { status: 'done', thumb: data.thumb_url } }));
        return true;
      }
      setRows((r) => ({ ...r, [slug]: { ...r[slug], status: 'err', error: data.error ?? '失敗' } }));
      return false;
    } catch {
      setRows((r) => ({ ...r, [slug]: { ...r[slug], status: 'err', error: '通信失敗' } }));
      return false;
    }
  }

  async function reimageAll() {
    setBulk(true);
    setDone(0);
    for (const c of columns) {
      // eslint-disable-next-line no-await-in-loop
      await reimage(c.slug);
      setDone((n) => n + 1);
    }
    setBulk(false);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Images className="h-5 w-5 text-accent-600" /> 生成済みコラム（{columns.length}件）
        </h2>
        {columns.length > 0 && (
          <button onClick={reimageAll} disabled={bulk || !aiOn} className="btn-accent text-sm disabled:opacity-50">
            {bulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            画像を全部作り直す
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        本文はそのまま、画像だけを現在のスタイル（写真風・正方形・基準画像）で作り直します。
        {bulk && <span className="ml-1 font-bold text-accent-700">実行中… {done}/{columns.length}</span>}
      </p>
      {!aiOn && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          OPENROUTER_API_KEY / ANTHROPIC_API_KEY が未設定だと作り直せません。
        </p>
      )}

      {columns.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">まだ生成されたコラムはありません。</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {columns.map((c) => {
            const row = rows[c.slug];
            return (
              <li key={c.slug} className="flex items-center gap-3 py-2.5">
                {row.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.thumb} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-md bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy-800">{c.title}</p>
                  <p className="text-xs text-slate-400">
                    {c.cat}・{new Date(c.published_at).toLocaleDateString('ja-JP')}
                    {row.status === 'done' && (
                      <span className="ml-2 inline-flex items-center gap-0.5 font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> 更新済
                      </span>
                    )}
                    {row.status === 'err' && (
                      <span className="ml-2 inline-flex items-center gap-0.5 font-bold text-red-600" title={row.error}>
                        <AlertCircle className="h-3 w-3" /> {row.error}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/column/${c.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> 表示
                  </Link>
                  <button
                    onClick={() => reimage(c.slug)}
                    disabled={row.status === 'busy' || bulk || !aiOn}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {row.status === 'busy' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    再生成
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
