'use client';

import { useRef, useState } from 'react';
import { Camera, X, Trash2 } from 'lucide-react';
import {
  DAMAGE_VIEWS, DAMAGE_TYPES, DAMAGE_SIZES, damageTypeMeta,
  type DamageMark, type DamageView, type DamageType, type DamageSize,
} from '@/lib/inspection-spec';

const PIN_TONE: Record<string, string> = {
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  sky: 'bg-sky-500',
};

// 各面の簡易シルエット（タップ位置の目安。線画のみ）
const SILHOUETTES: Record<DamageView, React.ReactNode> = {
  left: (
    <>
      <path d="M6,44 Q6,31 19,29 L30,19 Q35,13 45,13 L65,13 Q74,13 79,20 L90,30 Q94,32 94,44" />
      <path d="M33,20 L45,20 M52,14 L54,28 M70,15 L74,29" />
      <circle cx="26" cy="46" r="7" /><circle cx="74" cy="46" r="7" />
      <path d="M6,46 L19,46 M33,46 L67,46 M81,46 L94,46" />
    </>
  ),
  right: (
    <>
      <path d="M94,44 Q94,31 81,29 L70,19 Q65,13 55,13 L35,13 Q26,13 21,20 L10,30 Q6,32 6,44" />
      <path d="M67,20 L55,20 M48,14 L46,28 M30,15 L26,29" />
      <circle cx="74" cy="46" r="7" /><circle cx="26" cy="46" r="7" />
      <path d="M94,46 L81,46 M67,46 L33,46 M19,46 L6,46" />
    </>
  ),
  front: (
    <>
      <path d="M22,48 L22,24 Q22,16 32,15 L68,15 Q78,16 78,24 L78,48" />
      <path d="M30,24 Q30,20 36,20 L64,20 Q70,20 70,24 L70,33 L30,33 Z" />
      <rect x="40" y="37" width="20" height="6" rx="2" />
      <circle cx="33" cy="40" r="3" /><circle cx="67" cy="40" r="3" />
      <path d="M18,48 L82,48" />
    </>
  ),
  rear: (
    <>
      <path d="M22,48 L22,24 Q22,16 32,15 L68,15 Q78,16 78,24 L78,48" />
      <path d="M31,24 Q31,20 37,20 L63,20 Q69,20 69,24 L69,32 L31,32 Z" />
      <rect x="27" y="37" width="10" height="6" rx="1.5" /><rect x="63" y="37" width="10" height="6" rx="1.5" />
      <path d="M44,38 L56,38" />
      <path d="M18,48 L82,48" />
    </>
  ),
  roof: (
    <>
      <rect x="18" y="10" width="64" height="40" rx="12" />
      <path d="M18,22 L82,22 M18,38 L82,38" />
      <path d="M30,22 L30,38 M70,22 L70,38" />
    </>
  ),
};

type Props = {
  value: DamageMark[];
  onChange: (next: DamageMark[]) => void;
  sid: string; // 写真アップロード用
};

export function BodyMap({ value, onChange, sid }: Props) {
  const [view, setView] = useState<DamageView>('left');
  const [sel, setSel] = useState<string | null>(null);
  const [newType, setNewType] = useState<DamageType>('scratch');
  const [newSize, setNewSize] = useState<DamageSize>(2);
  const wrapRef = useRef<HTMLDivElement>(null);

  const marks = value.filter((m) => m.view === view);
  const selected = value.find((m) => m.id === sel) || null;

  function addAt(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-pin]')) return; // ピンのクリックは無視
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const m: DamageMark = { id, view, x, y, type: newType, size: newSize };
    onChange([...value, m]);
    setSel(id);
  }

  function patch(id: string, p: Partial<DamageMark>) {
    onChange(value.map((m) => (m.id === id ? { ...m, ...p } : m)));
  }
  function remove(id: string) {
    onChange(value.filter((m) => m.id !== id));
    if (sel === id) setSel(null);
  }
  async function addPhoto(id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file); fd.append('sid', sid);
    const res = await fetch('/api/appraisal/upload', { method: 'POST', body: fd });
    const j = await res.json();
    if (j.url) {
      const cur = value.find((m) => m.id === id);
      patch(id, { photos: [...(cur?.photos ?? []), j.url] });
    }
  }

  return (
    <div className="space-y-3">
      {/* 面タブ */}
      <div className="flex flex-wrap gap-1.5">
        {DAMAGE_VIEWS.map((v) => {
          const n = value.filter((m) => m.view === v.code).length;
          return (
            <button
              key={v.code}
              onClick={() => { setView(v.code); setSel(null); }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${view === v.code ? 'bg-navy-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-navy-400'}`}
            >
              {v.label}{n > 0 && <span className={`rounded-full px-1.5 text-[11px] ${view === v.code ? 'bg-white/20' : 'bg-slate-100'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* 記録する種類・大きさ（次にタップで付く内容） */}
      <div className="rounded-lg bg-slate-50 p-2.5">
        <p className="mb-1.5 text-[11px] font-bold text-slate-500">図をタップして記録 → 種類：</p>
        <div className="flex flex-wrap gap-1.5">
          {DAMAGE_TYPES.map((t) => (
            <button key={t.code} onClick={() => setNewType(t.code)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold transition ${newType === t.code ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 text-slate-600'}`}>
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-white ${PIN_TONE[t.tone]}`}>{t.abbr}</span>{t.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500">大きさ：</span>
          {DAMAGE_SIZES.map((s) => (
            <button key={s.code} onClick={() => setNewSize(s.code)}
              className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${newSize === s.code ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 text-slate-600'}`}
              title={s.desc}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* 展開図 */}
      <div
        ref={wrapRef}
        onClick={addAt}
        className="relative aspect-[5/3] w-full cursor-crosshair select-none overflow-hidden rounded-xl border border-slate-200 bg-[#F6FBFA]"
      >
        <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" fill="none" stroke="#9FD8CF" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
          {SILHOUETTES[view]}
        </svg>
        {marks.map((m) => {
          const meta = damageTypeMeta(m.type);
          const on = sel === m.id;
          return (
            <button
              key={m.id}
              data-pin
              onClick={(e) => { e.stopPropagation(); setSel(on ? null : m.id); }}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full text-[10px] font-black text-white ring-2 ring-white transition ${PIN_TONE[meta?.tone ?? 'amber']} ${on ? 'scale-125 ring-navy-600' : ''}`}
            >
              <span className="flex items-center justify-center" style={{ width: 18 + (m.size - 1) * 4, height: 18 + (m.size - 1) * 4 }}>{meta?.abbr}</span>
            </button>
          );
        })}
        <span className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] text-slate-400">{DAMAGE_VIEWS.find((v) => v.code === view)?.label}</span>
      </div>

      {/* 選択マーカーの編集 */}
      {selected && (
        <div className="rounded-xl border border-navy-200 bg-navy-50/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-navy-800">
              {damageTypeMeta(selected.type)?.label}・{DAMAGE_SIZES.find((s) => s.code === selected.size)?.label}
            </p>
            <button onClick={() => remove(selected.id)} className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" />削除</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAMAGE_TYPES.map((t) => (
              <button key={t.code} onClick={() => patch(selected.id, { type: t.code })}
                className={`rounded-md border px-2 py-0.5 text-xs font-bold ${selected.type === t.code ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 text-slate-600'}`}>{t.label}</button>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {DAMAGE_SIZES.map((s) => (
              <button key={s.code} onClick={() => patch(selected.id, { size: s.code })}
                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${selected.size === s.code ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 text-slate-600'}`}>{s.label}</button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={selected.note ?? ''} onChange={(e) => patch(selected.id, { note: e.target.value })} placeholder="メモ（任意）" className="input h-9 flex-1 text-sm" />
            <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(selected.id, f); e.currentTarget.value = ''; }} />
            </label>
          </div>
          {!!selected.photos?.length && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.photos.map((u, i) => (
                <div key={u} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                  <button onClick={() => patch(selected.id, { photos: selected.photos!.filter((_, j) => j !== i) })} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-slate-500">記録済みダメージ：<b>{value.length}</b> 件（各面タブに分かれて表示）</p>
      )}
    </div>
  );
}

/** 読み取り専用の展開図（査定表の出力用）。ダメージのある面のみ表示。 */
export function BodyMapView({ damages }: { damages: DamageMark[] }) {
  const views = DAMAGE_VIEWS.filter((v) => damages.some((d) => d.view === v.code));
  if (views.length === 0) return <p className="text-sm text-slate-400">記録された外装ダメージはありません。</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {views.map((v) => {
        const marks = damages.filter((d) => d.view === v.code);
        return (
          <div key={v.code} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="relative aspect-[5/3] bg-[#F6FBFA]">
              <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" fill="none" stroke="#9FD8CF" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
                {SILHOUETTES[v.code]}
              </svg>
              {marks.map((m) => {
                const meta = damageTypeMeta(m.type);
                return (
                  <span key={m.id} style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[9px] font-black text-white ring-1 ring-white ${PIN_TONE[meta?.tone ?? 'amber']}`}>
                    <span style={{ width: 15 + (m.size - 1) * 3, height: 15 + (m.size - 1) * 3 }} className="flex items-center justify-center">{meta?.abbr}</span>
                  </span>
                );
              })}
            </div>
            <p className="px-2 py-1 text-[11px] font-bold text-slate-600">{v.label}（{marks.length}）</p>
          </div>
        );
      })}
    </div>
  );
}
