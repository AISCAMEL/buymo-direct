'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { VEHICLE_SIZES, estimateWarrantyBySize, type VehicleSize } from '@/lib/warranty';

const yen = (n: number) => '¥' + n.toLocaleString();

/**
 * 車が未確定（手動入力）のときに、車両サイズから故障保証を「ざっくり概算」するUI。
 * 選ぶと税込の概算料金を親に通知（onChange）。年式・走行は任意（入れると精度UP）。
 */
export function WarrantySizeEstimate({
  onChange,
  defaultYear,
  defaultMileageKm,
}: {
  onChange: (taxInclFee: number, label: string) => void;
  defaultYear?: number | null;
  defaultMileageKm?: number | null;
}) {
  const [on, setOn] = useState(false);
  const [size, setSize] = useState<VehicleSize | ''>('');
  const [months, setMonths] = useState(12);
  const [year, setYear] = useState(defaultYear ? String(defaultYear) : '');
  const [km, setKm] = useState(defaultMileageKm != null ? String(defaultMileageKm) : '');

  // 税込概算（1,000円丸め）
  const excl = on && size ? estimateWarrantyBySize(size, { year: year ? Number(year) : null, mileageKm: km ? Number(km) * 1 : null, months }) : null;
  const incl = excl != null ? Math.round((excl * 1.1) / 1000) * 1000 : null;

  useEffect(() => {
    if (on && incl != null) onChange(incl, `故障保証（概算・${months >= 24 ? '2年' : '1年'}）`);
    else onChange(0, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, incl, months]);

  return (
    <div className="rounded-xl border-2 border-slate-200 p-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-bold text-navy-800"><ShieldCheck className="h-4 w-4 text-accent-600" />故障保証（車両サイズから概算）</span>
        <button type="button" onClick={() => setOn((v) => !v)} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-accent-600' : 'bg-slate-300'}`} aria-pressed={on}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </label>
      <p className="mt-1 text-xs text-slate-500">車種が未確定でも、サイズを選べばおおよその保証料を出せます（<b>概算</b>。正式な金額は車両確定後に算出）。</p>

      {on && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {VEHICLE_SIZES.map((s) => (
              <button key={s.code} type="button" onClick={() => setSize(s.code)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${size === s.code ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-200 text-slate-600 hover:border-accent-400'}`}
                title={s.hint}>{s.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              {[12, 24].map((m) => (
                <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-md px-3 py-1 text-sm font-bold ${months === m ? 'bg-navy-600 text-white' : 'text-slate-600'}`}>{m >= 24 ? '2年' : '1年'}</button>
              ))}
            </div>
            <label className="text-xs text-slate-500">年式<input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="任意" className="input ml-1 h-8 w-20 text-sm" /></label>
            <label className="text-xs text-slate-500">走行(km)<input value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" placeholder="任意" className="input ml-1 h-8 w-24 text-sm" /></label>
          </div>
          {size && incl != null ? (
            <div className="flex items-center justify-between rounded-lg bg-accent-50 px-4 py-2.5">
              <span className="text-sm font-bold text-navy-800">概算の故障保証料（税込）</span>
              <span className="text-lg font-black text-accent-700">{yen(incl)}<span className="ml-1 text-xs font-bold text-slate-500">概算</span></span>
            </div>
          ) : (
            <p className="text-xs text-slate-400">サイズを選ぶと概算が表示されます。</p>
          )}
        </div>
      )}
    </div>
  );
}
