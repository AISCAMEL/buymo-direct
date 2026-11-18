'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardCheck, Plus, Loader2, FileText, Pencil, Trash2, Car } from 'lucide-react';
import { ratedCount } from '@/lib/inspection-spec';
import type { InspectionSheet } from '@/lib/inspection';

function gradeTone(g?: string | null) {
  switch (g) {
    case 'S': return 'bg-emerald-100 text-emerald-700';
    case 'A': return 'bg-sky-100 text-sky-700';
    case 'B': return 'bg-slate-100 text-slate-600';
    case 'C': return 'bg-amber-100 text-amber-700';
    case 'D': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-400';
  }
}

export function InspectionList({ basePath, initial }: { basePath: string; initial: InspectionSheet[] }) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initial);
  const [open, setOpen] = useState(initial.length === 0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ maker: '', model: '', model_year: '', mileage_km: '', plate: '', customer_name: '' });

  async function create() {
    setBusy(true);
    try {
      const res = await fetch('/api/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maker: form.maker.trim() || null,
          model: form.model.trim() || null,
          model_year: form.model_year ? Number(form.model_year) : null,
          mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
          plate: form.plate.trim() || null,
          customer_name: form.customer_name.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok && data.id) router.push(`${basePath}/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('この査定表を削除しますか？')) return;
    const res = await fetch(`/api/inspection/${id}`, { method: 'DELETE' });
    if (res.ok) setSheets((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* 新規作成 */}
      <div className="card p-4">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600"><Plus className="h-5 w-5" /></span>
          <span className="font-black text-navy-800">新しい査定表をつくる</span>
          <span className="ml-auto text-xs text-slate-400">車両情報は後からでもOK</span>
        </button>
        {open && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <input className="input text-sm" placeholder="メーカー（例：トヨタ）" value={form.maker} onChange={(e) => setForm({ ...form, maker: e.target.value })} />
              <input className="input text-sm" placeholder="車種（例：プリウス）" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              <input className="input text-sm" placeholder="年式（例：2019）" inputMode="numeric" value={form.model_year} onChange={(e) => setForm({ ...form, model_year: e.target.value })} />
              <input className="input text-sm" placeholder="走行(km)" inputMode="numeric" value={form.mileage_km} onChange={(e) => setForm({ ...form, mileage_km: e.target.value })} />
              <input className="input text-sm" placeholder="ナンバー（任意）" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
              <input className="input text-sm" placeholder="所有者/提示先（任意）" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <button onClick={create} disabled={busy} className="btn-accent inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} 検査をはじめる
            </button>
          </div>
        )}
      </div>

      {/* 一覧 */}
      {sheets.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">まだ査定表はありません。上の「新しい査定表をつくる」から始めましょう。</div>
      ) : (
        <div className="space-y-2">
          {sheets.map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black ${gradeTone(s.overall_rating)}`}>
                {s.overall_rating ?? '—'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy-800">
                  <Car className="mr-1 inline h-4 w-4 text-slate-400" />
                  {[s.maker, s.model].filter(Boolean).join(' ') || '車両未入力'}
                  {s.model_year ? ` / ${s.model_year}年` : ''}
                  {s.mileage_km != null ? ` / ${s.mileage_km.toLocaleString()}km` : ''}
                </p>
                <p className="text-xs text-slate-400">
                  {s.status === 'done' ? '完了' : '下書き'} ・ 入力 {ratedCount(s.inspection)} 項目
                  {s.appraised_price != null ? ` ・ 査定額 ¥${s.appraised_price.toLocaleString()}` : ''}
                  {s.plate ? ` ・ ${s.plate}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`${basePath}/${s.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  <Pencil className="h-4 w-4" /> 検査
                </Link>
                <Link href={`${basePath}/${s.id}/sheet`} className="inline-flex items-center gap-1 rounded-lg border border-accent-300 bg-accent-50 px-3 py-1.5 text-sm font-bold text-accent-700 hover:bg-accent-100">
                  <FileText className="h-4 w-4" /> 査定表
                </Link>
                <button onClick={() => remove(s.id)} className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="削除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
