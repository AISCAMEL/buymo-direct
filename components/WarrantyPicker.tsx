'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatYen } from '@/lib/format';
import { isImportMaker } from '@/lib/warranty';
import {
  DISPLACEMENTS, WARRANTY_PLANS, domesticWarrantyFee, ageTier, kmTier,
  type DisplacementKey, type WarrantyPlan,
} from '@/lib/warranty-domestic';
import {
  IMPORT_CLASSES, IMPORT_DISPLACEMENTS, importWarrantyFee, importAgeTier, importModelsForMaker,
  type ImportClass, type ImportDispKey,
} from '@/lib/warranty-import';

const TAX = 1.1;
type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null; displacementCc?: number | null };

/** 排気量(cc)から輸入車の区分を推定。 */
function guessImportDisp(cc?: number | null): ImportDispKey {
  if (!cc) return 'cc2000';
  if (cc <= 1400) return 'cc1400';
  if (cc <= 2000) return 'cc2000';
  if (cc <= 2500) return 'cc2500';
  if (cc <= 3000) return 'cc3000';
  if (cc <= 4000) return 'cc4000';
  if (cc <= 5000) return 'cc5000';
  return 'cc6000';
}

/** 故障保証を選ぶUI（国産＝プラン料金表 / 輸入車＝クラス料金表）。onChange で税込価格とラベルを親に通知。 */
export function WarrantyPicker({ vehicle, onChange }: { vehicle: Vehicle; onChange: (taxInclFee: number, label: string) => void }) {
  const isKei = !!vehicle.bodyType && vehicle.bodyType.includes('軽');
  const isImport = isImportMaker(vehicle.maker);
  const [enabled, setEnabled] = useState(false);

  return (
    <div className={`rounded-xl border-2 p-3 transition ${enabled ? 'border-navy-400 bg-navy-50' : 'border-slate-200'}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <div className="flex-1">
          <span className="text-sm font-bold text-navy-800">故障保証をつける</span>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {isImport ? 'クラス・排気量・年式・走行距離から料金表で自動計算' : '年式・走行距離・排気量から料金表で自動計算'}
          </p>
        </div>
      </label>

      {enabled && (
        <div className="mt-3 pl-7">
          {isImport
            ? <ImportPicker vehicle={vehicle} onChange={onChange} />
            : <DomesticPicker vehicle={vehicle} isKei={isKei} onChange={onChange} />}
        </div>
      )}
      {!enabled && <ResetOnDisable onChange={onChange} />}
    </div>
  );
}

/** チェックを外したとき親に 0 を通知。 */
function ResetOnDisable({ onChange }: { onChange: (fee: number, label: string) => void }) {
  useEffect(() => { onChange(0, ''); }, [onChange]);
  return null;
}

/* ------------------------------ 国産 ------------------------------ */
function DomesticPicker({ vehicle, isKei, onChange }: { vehicle: Vehicle; isKei: boolean; onChange: (fee: number, label: string) => void }) {
  const eligible = ageTier(vehicle.year) != null && kmTier(vehicle.mileageKm) != null;
  const [disp, setDisp] = useState<DisplacementKey>(isKei ? 'kei' : 'cc2000');
  const [plan, setPlan] = useState<WarrantyPlan>('basic');
  const [months, setMonths] = useState(12);

  const effDisp: DisplacementKey = isKei ? 'kei' : disp;
  const effMonths = plan === 'simple' ? 12 : months;
  const feeExcl = eligible ? domesticWarrantyFee(effDisp, vehicle.year, vehicle.mileageKm, plan, effMonths) : null;
  const feeIncl = feeExcl != null ? Math.round(feeExcl * TAX) : null;
  const planLabel = WARRANTY_PLANS.find((p) => p.key === plan)?.label ?? '';

  useEffect(() => {
    if (feeIncl) onChange(feeIncl, `保証 ${planLabel}・${effMonths >= 24 ? '2年' : '1年'}`);
    else onChange(0, '');
  }, [feeIncl, planLabel, effMonths, onChange]);

  if (!eligible) return <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">この車両は保証対象外です（13年超 または 13万km超）。</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">料金（税込）</span>
        {feeIncl != null && <span className="text-sm font-bold text-accent-600">{formatYen(feeIncl)}</span>}
      </div>
      {/* 排気量 */}
      <Field label="排気量">
        {DISPLACEMENTS.map((d) => (
          <Chip key={d.key} active={effDisp === d.key} disabled={isKei && d.key !== 'kei'} onClick={() => setDisp(d.key)}>{d.label}</Chip>
        ))}
      </Field>
      {isKei && <p className="text-[10px] text-slate-400">※ 軽自動車で自動選択</p>}
      {/* プラン */}
      <Field label="プラン">
        {WARRANTY_PLANS.map((p) => (<Chip key={p.key} active={plan === p.key} onClick={() => setPlan(p.key)}>{p.label}</Chip>))}
      </Field>
      {/* 期間 */}
      <Field label="保証期間">
        <Chip active={effMonths === 12} onClick={() => setMonths(12)}>1年</Chip>
        <Chip active={effMonths === 24} disabled={plan === 'simple'} onClick={() => setMonths(24)}>2年</Chip>
      </Field>
      {plan === 'simple' && <p className="text-[10px] text-slate-400">※ シンプルは1年のみ</p>}
    </div>
  );
}

/* ------------------------------ 輸入車 ------------------------------ */
function ImportPicker({ vehicle, onChange }: { vehicle: Vehicle; onChange: (fee: number, label: string) => void }) {
  const models = useMemo(() => importModelsForMaker(vehicle.maker), [vehicle.maker]);
  const eligible = importAgeTier(vehicle.year, vehicle.mileageKm) != null;
  const [modelIdx, setModelIdx] = useState<number>(-1);
  const [cls, setCls] = useState<ImportClass>(3);
  const [disp, setDisp] = useState<ImportDispKey>(guessImportDisp(vehicle.displacementCc));
  const [months, setMonths] = useState(12);

  // 車種を選んだらクラスを自動設定
  useEffect(() => {
    if (modelIdx >= 0 && models[modelIdx]) setCls(models[modelIdx].cls);
  }, [modelIdx, models]);

  const feeExcl = eligible ? importWarrantyFee(cls, disp, vehicle.year, vehicle.mileageKm, months) : null;
  const feeIncl = feeExcl != null ? Math.round(feeExcl * TAX) : null;

  useEffect(() => {
    if (feeIncl) onChange(feeIncl, `保証 クラス${cls}・${months >= 12 ? '1年' : '6ヶ月'}`);
    else onChange(0, '');
  }, [feeIncl, cls, months, onChange]);

  if (!eligible) return <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">この車両は保証対象外です（10年超 または 8.1万km超）。輸入車は初度登録10年・走行8.1万kmまでが対象です。</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">料金（税込）</span>
        {feeIncl != null && <span className="text-sm font-bold text-accent-600">{formatYen(feeIncl)}</span>}
      </div>

      {/* 車種（クラスを自動判定） */}
      {models.length > 0 && (
        <div>
          <span className="mb-1 block text-[11px] font-bold text-slate-500">車種（クラス自動判定）</span>
          <select className="input h-9 text-sm" value={modelIdx} onChange={(e) => setModelIdx(Number(e.target.value))}>
            <option value={-1}>選択してください（または下でクラスを直接指定）</option>
            {models.map((m, i) => (<option key={i} value={i}>{m.model}（クラス{m.cls}）</option>))}
          </select>
        </div>
      )}

      {/* クラス */}
      <Field label="クラス">
        {IMPORT_CLASSES.map((c) => (
          <Chip key={c} active={cls === c} onClick={() => { setCls(c); setModelIdx(-1); }}>{c}</Chip>
        ))}
      </Field>
      <p className="text-[10px] text-slate-400">※ クラスは輸入車保証クラス表に基づきます（不明な場合は車種から選択）。</p>

      {/* 排気量 */}
      <Field label="排気量">
        {IMPORT_DISPLACEMENTS.map((d) => (<Chip key={d.key} active={disp === d.key} onClick={() => setDisp(d.key)}>{d.label}</Chip>))}
      </Field>

      {/* 期間 */}
      <Field label="保証期間">
        <Chip active={months === 6} onClick={() => setMonths(6)}>6ヶ月</Chip>
        <Chip active={months === 12} onClick={() => setMonths(12)}>1年</Chip>
      </Field>
      <p className="text-[10px] text-slate-400">※ 保証上限は車両本体価格（税抜）の80%まで。ハイブリッド機構は別途 ¥22,000（税抜）。</p>
    </div>
  );
}

/* ------------------------------ 小物 ------------------------------ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}</span>
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
