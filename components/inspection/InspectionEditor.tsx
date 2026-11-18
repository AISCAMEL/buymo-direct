'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, Camera, Loader2, Check, FileText, CheckCircle2, X, Sparkles,
} from 'lucide-react';
import {
  INSPECTION_SPEC, RATINGS, OVERALL_GRADES, ALL_ITEM_COUNT, ratedCount, suggestOverall,
  type InspectionData, type RatingCode,
} from '@/lib/inspection-spec';
import type { InspectionSheet } from '@/lib/inspection';

const TONE: Record<string, { on: string; off: string }> = {
  emerald: { on: 'bg-emerald-500 text-white border-emerald-500', off: 'border-slate-200 text-slate-500 hover:border-emerald-400' },
  sky: { on: 'bg-sky-500 text-white border-sky-500', off: 'border-slate-200 text-slate-500 hover:border-sky-400' },
  amber: { on: 'bg-amber-500 text-white border-amber-500', off: 'border-slate-200 text-slate-500 hover:border-amber-400' },
  red: { on: 'bg-red-500 text-white border-red-500', off: 'border-slate-200 text-slate-500 hover:border-red-400' },
  slate: { on: 'bg-slate-400 text-white border-slate-400', off: 'border-slate-200 text-slate-400 hover:border-slate-400' },
};

type Save = 'idle' | 'saving' | 'saved';

export function InspectionEditor({ sheet, basePath }: { sheet: InspectionSheet; basePath: string }) {
  const [maker, setMaker] = useState(sheet.maker ?? '');
  const [model, setModel] = useState(sheet.model ?? '');
  const [year, setYear] = useState(sheet.model_year?.toString() ?? '');
  const [mileage, setMileage] = useState(sheet.mileage_km?.toString() ?? '');
  const [plate, setPlate] = useState(sheet.plate ?? '');
  const [customer, setCustomer] = useState(sheet.customer_name ?? '');
  const [vehicle, setVehicle] = useState<Record<string, string>>((sheet.vehicle as Record<string, string>) ?? {});
  const [data, setData] = useState<InspectionData>(sheet.inspection ?? {});
  const [overall, setOverall] = useState(sheet.overall_rating ?? '');
  const [price, setPrice] = useState(sheet.appraised_price?.toString() ?? '');
  const [cost, setCost] = useState(sheet.cost_estimate?.toString() ?? '');
  const [note, setNote] = useState(sheet.internal_note ?? '');
  const [status, setStatus] = useState<'draft' | 'done'>(sheet.status);
  const [openSec, setOpenSec] = useState<string | null>(INSPECTION_SPEC[0].key);
  const [save, setSave] = useState<Save>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useCallback(() => ({
    maker: maker.trim() || null,
    model: model.trim() || null,
    model_year: year ? Number(year) : null,
    mileage_km: mileage ? Number(mileage) : null,
    plate: plate.trim() || null,
    customer_name: customer.trim() || null,
    vehicle,
    inspection: data,
    overall_rating: overall || null,
    appraised_price: price ? Number(price) : null,
    cost_estimate: cost ? Number(cost) : null,
    internal_note: note.trim() || null,
    status,
  }), [maker, model, year, mileage, plate, customer, vehicle, data, overall, price, cost, note, status]);

  const doSave = useCallback(async () => {
    setSave('saving');
    try {
      await fetch(`/api/inspection/${sheet.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()),
      });
      setSave('saved');
    } catch {
      setSave('idle');
    }
  }, [sheet.id, payload]);

  // 変更を1.2秒後に自動保存
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSave('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [doSave]);

  function setItem(key: string, patch: Partial<{ rating: RatingCode; note: string; photos: string[] }>) {
    setData((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  async function addPhoto(key: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('sid', sheet.id);
    const res = await fetch('/api/appraisal/upload', { method: 'POST', body: fd });
    const j = await res.json();
    if (j.url) setItem(key, { photos: [...(data[key]?.photos ?? []), j.url] });
  }

  const rated = ratedCount(data);
  const suggestion = suggestOverall(data);

  return (
    <div className="space-y-4 pb-24">
      {/* 進捗バー（上部固定） */}
      <div className="sticky top-0 z-20 -mx-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>検査の進捗</span><span>{rated}/{ALL_ITEM_COUNT}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.round((rated / ALL_ITEM_COUNT) * 100)}%` }} />
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-400">
          {save === 'saving' ? <span className="inline-flex items-center gap-1 text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />保存中</span>
            : save === 'saved' ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3.5 w-3.5" />保存済み</span>
            : ''}
        </span>
        <Link href={`${basePath}/${sheet.id}/sheet`} className="btn-accent inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-sm">
          <FileText className="h-4 w-4" /> 査定表
        </Link>
      </div>

      {/* 車両情報 */}
      <section className="card p-4">
        <h2 className="mb-3 font-black text-navy-800">車両情報</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="メーカー" value={maker} onChange={setMaker} />
          <Field label="車種" value={model} onChange={setModel} />
          <Field label="年式" value={year} onChange={setYear} numeric />
          <Field label="走行(km)" value={mileage} onChange={setMileage} numeric />
          <Field label="グレード" value={vehicle.grade ?? ''} onChange={(v) => setVehicle({ ...vehicle, grade: v })} />
          <Field label="型式" value={vehicle.type_code ?? ''} onChange={(v) => setVehicle({ ...vehicle, type_code: v })} />
          <Field label="車台番号" value={vehicle.vin ?? ''} onChange={(v) => setVehicle({ ...vehicle, vin: v })} />
          <Field label="カラー" value={vehicle.color ?? ''} onChange={(v) => setVehicle({ ...vehicle, color: v })} />
          <Field label="車検満了" value={vehicle.shaken_until ?? ''} onChange={(v) => setVehicle({ ...vehicle, shaken_until: v })} placeholder="2026-08" />
          <Field label="ナンバー" value={plate} onChange={setPlate} />
          <Field label="所有者/提示先" value={customer} onChange={setCustomer} />
        </div>
      </section>

      {/* 検査セクション */}
      {INSPECTION_SPEC.map((sec) => {
        const secRated = sec.items.filter((it) => data[it.key]?.rating).length;
        const isOpen = openSec === sec.key;
        return (
          <section key={sec.key} className="card overflow-hidden p-0">
            <button onClick={() => setOpenSec(isOpen ? null : sec.key)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
              <span className="font-black text-navy-800">{sec.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${secRated === sec.items.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {secRated}/{sec.items.length}
              </span>
              <ChevronDown className={`ml-auto h-5 w-5 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {sec.items.map((it) => {
                  const cur = data[it.key] ?? {};
                  return (
                    <div key={it.key} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="min-w-[7rem] flex-1">
                          <p className="text-sm font-bold text-slate-700">{it.label}</p>
                          {it.hint && <p className="text-[11px] text-slate-400">{it.hint}</p>}
                        </div>
                        <div className="flex gap-1.5">
                          {RATINGS.map((r) => {
                            const on = cur.rating === r.code;
                            const tone = TONE[r.tone];
                            return (
                              <button
                                key={r.code}
                                onClick={() => setItem(it.key, { rating: on ? undefined : r.code })}
                                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-base font-black transition ${on ? tone.on : tone.off}`}
                                title={r.label}
                              >
                                {r.mark}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* メモ＋写真 */}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={cur.note ?? ''}
                          onChange={(e) => setItem(it.key, { note: e.target.value })}
                          placeholder="メモ（任意）"
                          className="input h-9 flex-1 text-sm"
                        />
                        <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
                          <Camera className="h-4 w-4" />
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(it.key, f); e.currentTarget.value = ''; }} />
                        </label>
                      </div>
                      {!!cur.photos?.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {cur.photos.map((u, i) => (
                            <div key={u} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                              <button
                                onClick={() => setItem(it.key, { photos: cur.photos!.filter((_, j) => j !== i) })}
                                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white"
                                aria-label="写真を削除"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* 総合評価・査定額・内部メモ */}
      <section className="card space-y-4 p-4">
        <h2 className="font-black text-navy-800">総合評価・査定額</h2>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">総合評価</span>
            {overall !== suggestion && (
              <button onClick={() => setOverall(suggestion)} className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-700 hover:bg-accent-100">
                <Sparkles className="h-3 w-3" /> AI提案：{suggestion}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {OVERALL_GRADES.map((g) => (
              <button
                key={g.code}
                onClick={() => setOverall(overall === g.code ? '' : g.code)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${overall === g.code ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 text-slate-600 hover:border-navy-400'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-slate-700">査定額（提案用に表示）</label>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-slate-400">¥</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="例：1250000" className="input h-10 flex-1 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">整備概算（内部）</label>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-slate-400">¥</span>
              <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" placeholder="例：80000" className="input h-10 flex-1 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">内部メモ（提案用には出ません）</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input mt-1 w-full text-sm" placeholder="社内向けの所見・仕入れ判断など" />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={() => setStatus(status === 'done' ? 'draft' : 'done')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${status === 'done' ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            <CheckCircle2 className="h-4 w-4" /> {status === 'done' ? '完了にしました' : '検査を完了にする'}
          </button>
          <Link href={`${basePath}/${sheet.id}/sheet`} className="btn-accent inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> 査定表を見る（保管用/提案用）
          </Link>
          <span className="ml-auto text-xs text-slate-400">変更は自動保存されます</span>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, numeric, placeholder }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={numeric ? 'numeric' : undefined}
        placeholder={placeholder}
        className="input mt-0.5 h-9 w-full text-sm"
      />
    </label>
  );
}
