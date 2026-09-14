'use client';

import { useState } from 'react';
import { Upload, Download, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PREFECTURES } from '@/lib/constants';

const TEMPLATE = [
  'タイトル,メーカー,モデル,年式,走行距離(km),価格(円),ボディタイプ,ミッション,燃料,カラー,都道府県,修復歴(0/1),説明',
  '"トヨタ プリウス 2020年 走行3万km 車検2年",トヨタ,プリウス,2020,30000,1500000,セダン,CVT,ハイブリッド,パールホワイト,東京都,0,"非喫煙 ワンオーナー"',
].join('\r\n');

type ResultRow = { row: number; title: string; ok: boolean; error?: string };

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map((line) => {
    const cols: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  async function onImport() {
    if (!file) return;
    setImporting(true);
    setResults(null);

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { setImporting(false); return; }

    const header = rows[0];
    const dataRows = rows.slice(1);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    const res: ResultRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const get = (label: string) => {
        const idx = header.findIndex((h) => h.includes(label));
        return idx >= 0 ? r[idx]?.replace(/^"|"$/g, '') ?? '' : '';
      };

      const title = get('タイトル');
      const maker = get('メーカー');
      const model = get('モデル');
      const year = Number(get('年式'));
      const mileage_km = Number(get('走行距離'));
      const price = Number(get('価格'));
      const prefecture = get('都道府県');

      if (!title || !maker || !model || !year || !price || !PREFECTURES.includes(prefecture)) {
        res.push({ row: i + 2, title: title || `行${i + 2}`, ok: false, error: '必須項目が不足しています' });
        continue;
      }

      const { error } = await supabase.from('listings').insert({
        seller_id: user.id,
        status: 'active',
        title, maker, model, year, mileage_km: mileage_km || 0, price, prefecture,
        body_type: get('ボディタイプ') || null,
        transmission: get('ミッション') || null,
        fuel: get('燃料') || null,
        color: get('カラー') || null,
        repair_history: get('修復歴') === '1',
        description: get('説明') || null,
      });

      res.push({ row: i + 2, title, ok: !error, error: error?.message });
    }

    setResults(res);
    setImporting(false);
  }

  const ok = results?.filter((r) => r.ok).length ?? 0;
  const ng = results?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-black">一括出品（CSV インポート）</h1>

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">① テンプレートをダウンロード</p>
          <a
            href={`data:text/csv;charset=utf-8,﻿${encodeURIComponent(TEMPLATE)}`}
            download="import-template.csv"
            className="btn-outline flex items-center gap-1 text-sm"
          >
            <Download className="h-4 w-4" /> テンプレート
          </a>
        </div>
        <hr className="border-slate-100" />
        <p className="text-sm font-bold text-slate-700">② CSV ファイルを選択してインポート</p>
        <div className="flex gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50">
            <Upload className="h-4 w-4 shrink-0" />
            {file ? file.name : 'CSVファイルを選択'}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={onImport} disabled={!file || importing} className="btn-accent shrink-0 disabled:opacity-50">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'インポート'}
          </button>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-bold">注意事項</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>1回のインポートは最大100件まで</li>
            <li>都道府県は「東京都」「大阪府」など正式名称で記入</li>
            <li>インポートした出品は即時「公開中」になります</li>
          </ul>
        </div>
      </div>

      {results && (
        <div className="card p-5 space-y-3">
          <p className="font-bold">
            インポート完了：
            <span className="text-emerald-600"> {ok}件成功 </span>
            {ng > 0 && <span className="text-red-500"> {ng}件失敗</span>}
          </p>
          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-sm">
            {results.map((r) => (
              <li key={r.row} className={`flex items-start gap-2 py-2 ${r.ok ? '' : 'text-red-600'}`}>
                {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                <span>行{r.row}：{r.title}{r.error && ` — ${r.error}`}</span>
              </li>
            ))}
          </ul>
          <a href="/dashboard/listings" className="btn-accent block text-center text-sm">出品管理へ →</a>
        </div>
      )}
    </div>
  );
}
