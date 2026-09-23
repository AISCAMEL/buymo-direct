'use client';

import { useMemo, useState } from 'react';
import { formatYen } from '@/lib/format';
import { applyWarrantyAdjust } from '@/lib/pricing-config';
import {
  DISPLACEMENTS, WARRANTY_PLANS, domesticWarrantyFee, ageTier, kmTier,
  type DisplacementKey, type WarrantyPlan,
} from '@/lib/warranty-domestic';
import {
  IMPORT_CLASSES, IMPORT_DISPLACEMENTS, IMPORT_CLASS_TABLE, importWarrantyFee, importAgeTier,
  type ImportClass, type ImportDispKey,
} from '@/lib/warranty-import';

const TAX = 1.1;
type Kind = 'domestic' | 'import';

export function WarrantySimulator({ adjustPercent }: { adjustPercent: number }) {
  const now = new Date().getFullYear();
  const [kind, setKind] = useState<Kind>('domestic');
  const [year, setYear] = useState(now - 3);
  const [mileageMan, setMileageMan] = useState(4); // 万km

  // 国産
  const [disp, setDisp] = useState<DisplacementKey>('cc2000');
  const [plan, setPlan] = useState<WarrantyPlan>('basic');
  const [months, setMonths] = useState(12);

  // 輸入車
  const [brand, setBrand] = useState('');
  const [modelIdx, setModelIdx] = useState(-1);
  const [cls, setCls] = useState<ImportClass>(3);
  const [impDisp, setImpDisp] = useState<ImportDispKey>('cc2000');
  const [impMonths, setImpMonths] = useState(12);

  const mileageKm = Math.round(mileageMan * 10000);
  const brands = useMemo(() => Object.keys(IMPORT_CLASS_TABLE), []);
  const models = brand ? IMPORT_CLASS_TABLE[brand] ?? [] : [];

  // クラスは車種選択で自動
  const effCls = modelIdx >= 0 && models[modelIdx] ? models[modelIdx].cls : cls;

  const result = useMemo(() => {
    if (kind === 'domestic') {
      const a = ageTier(year), k = kmTier(mileageKm);
      if (a == null || k == null) return { ok: false as const, reason: '対象外（13年超 または 13万km超）' };
      const excl = domesticWarrantyFee(disp, year, mileageKm, plan, plan === 'simple' ? 12 : months);
      if (excl == null) return { ok: false as const, reason: 'この条件では料金がありません' };
      const incl = Math.round(excl * TAX);
      return { ok: true as const, tier: `経過${a}年以内 / ${k}万km以内`, excl, incl, final: applyWarrantyAdjust(incl, adjustPercent) };
    }
    const tier = importAgeTier(year, mileageKm);
    if (!tier) return { ok: false as const, reason: '対象外（10年超 または 8.1万km超）' };
    const excl = importWarrantyFee(effCls, impDisp, year, mileageKm, impMonths);
    if (excl == null) return { ok: false as const, reason: 'この条件では料金がありません' };
    const incl = Math.round(excl * TAX);
    const tierLabel = { y3: '3年/3.1万km以内', y5: '5年/5.1万km以内', y7: '7年/7.1万km以内', y10: '10年/8.1万km以内' }[tier];
    return { ok: true as const, tier: tierLabel, excl, incl, final: applyWarrantyAdjust(incl, adjustPercent) };
  }, [kind, year, mileageKm, disp, plan, months, effCls, impDisp, impMonths, adjustPercent]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* 入力 */}
      <div className="card space-y-4 p-5">
        {/* 種別 */}
        <div className="flex gap-2">
          <Seg active={kind === 'domestic'} onClick={() => setKind('domestic')}>国産車</Seg>
          <Seg active={kind === 'import'} onClick={() => setKind('import')}>輸入車</Seg>
        </div>

        {/* 共通：年式・距離 */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">年式（初度登録年）</span>
            <input type="number" min={1990} max={now} value={year} onChange={(e) => setYear(Number(e.target.value))} className="input h-9 text-sm" />
            <span className="mt-0.5 block text-[11px] text-slate-400">経過 約{Math.max(0, now - year)}年</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">走行距離</span>
            <div className="flex items-center gap-1">
              <input type="number" min={0} step={0.5} value={mileageMan} onChange={(e) => setMileageMan(Math.max(0, Number(e.target.value)))} className="input h-9 text-sm" />
              <span className="text-xs text-slate-400">万km</span>
            </div>
            <span className="mt-0.5 block text-[11px] text-slate-400">{formatYen(mileageKm).replace('¥', '')} km</span>
          </label>
        </div>

        {kind === 'domestic' ? (
          <>
            <Group label="排気量">
              {DISPLACEMENTS.map((d) => <Chip key={d.key} active={disp === d.key} onClick={() => setDisp(d.key)}>{d.label}</Chip>)}
            </Group>
            <Group label="プラン">
              {WARRANTY_PLANS.map((p) => <Chip key={p.key} active={plan === p.key} onClick={() => setPlan(p.key)}>{p.label}</Chip>)}
            </Group>
            <Group label="保証期間">
              <Chip active={(plan === 'simple' ? 12 : months) === 12} onClick={() => setMonths(12)}>1年</Chip>
              <Chip active={months === 24} disabled={plan === 'simple'} onClick={() => setMonths(24)}>2年</Chip>
            </Group>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">メーカー</span>
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setModelIdx(-1); }} className="input h-9 text-sm">
                  <option value="">（クラスを直接指定）</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">車種</span>
                <select value={modelIdx} onChange={(e) => setModelIdx(Number(e.target.value))} disabled={!brand} className="input h-9 text-sm disabled:opacity-40">
                  <option value={-1}>—</option>
                  {models.map((m, i) => <option key={i} value={i}>{m.model}（クラス{m.cls}）</option>)}
                </select>
              </label>
            </div>
            <Group label={`クラス${modelIdx >= 0 ? '（車種から自動）' : ''}`}>
              {IMPORT_CLASSES.map((c) => <Chip key={c} active={effCls === c} disabled={modelIdx >= 0} onClick={() => { setCls(c); }}>{c}</Chip>)}
            </Group>
            <Group label="排気量">
              {IMPORT_DISPLACEMENTS.map((d) => <Chip key={d.key} active={impDisp === d.key} onClick={() => setImpDisp(d.key)}>{d.label}</Chip>)}
            </Group>
            <Group label="保証期間">
              <Chip active={impMonths === 6} onClick={() => setImpMonths(6)}>6ヶ月</Chip>
              <Chip active={impMonths === 12} onClick={() => setImpMonths(12)}>1年</Chip>
            </Group>
          </>
        )}
      </div>

      {/* 結果 */}
      <div className="card h-fit space-y-3 p-5">
        <h2 className="text-sm font-black text-navy-800">見積り結果</h2>
        {result.ok ? (
          <>
            <div className="rounded-lg bg-navy-50 p-3 text-center">
              <p className="text-[11px] text-slate-500">お客様に提示される保証料（税込）</p>
              <p className="text-2xl font-black text-navy-800">{formatYen(result.final)}</p>
              {adjustPercent !== 0 && <p className="text-[11px] text-accent-600">調整 {adjustPercent >= 0 ? '+' : ''}{adjustPercent}% 適用後</p>}
            </div>
            <dl className="space-y-1 text-sm">
              <Row label="適用区分" value={result.tier} />
              <Row label="料金表（税抜）" value={formatYen(result.excl)} />
              <Row label="料金表（税込）" value={formatYen(result.incl)} />
              {adjustPercent !== 0 && <Row label={`調整後（${adjustPercent >= 0 ? '+' : ''}${adjustPercent}%）`} value={formatYen(result.final)} strong />}
            </dl>
            {kind === 'import' && <p className="text-[11px] text-slate-400">※ 保証上限＝車両本体価格（税抜）の80%。ハイブリッド機構は別途¥22,000（税抜）。</p>}
          </>
        ) : (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{result.reason}</div>
        )}
      </div>
    </div>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${active ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
      {children}
    </button>
  );
}
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition disabled:opacity-40 ${active ? 'border-navy-500 bg-white text-navy-700' : 'border-slate-200 text-slate-500'}`}>
      {children}
    </button>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? 'font-black text-navy-800' : 'font-bold'}>{value}</dd>
    </div>
  );
}
