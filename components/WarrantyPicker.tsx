'use client';

import { useEffect, useState } from 'react';
import { formatYen } from '@/lib/format';
import { isImportMaker } from '@/lib/warranty';
import {
  DISPLACEMENTS, WARRANTY_PLANS, domesticWarrantyFee, ageTier, kmTier,
  type DisplacementKey, type WarrantyPlan,
} from '@/lib/warranty-domestic';

const TAX = 1.1;
type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null };

/** 国産保証（PDF料金表）を選ぶUI。onChange で税込価格とラベルを親に通知。 */
export function WarrantyPicker({ vehicle, onChange }: { vehicle: Vehicle; onChange: (taxInclFee: number, label: string) => void }) {
  const isKei = !!vehicle.bodyType && vehicle.bodyType.includes('軽');
  const isImport = isImportMaker(vehicle.maker);
  const eligible = ageTier(vehicle.year) != null && kmTier(vehicle.mileageKm) != null;

  const [enabled, setEnabled] = useState(false);
  const [disp, setDisp] = useState<DisplacementKey>(isKei ? 'kei' : 'cc2000');
  const [plan, setPlan] = useState<WarrantyPlan>('basic');
  const [months, setMonths] = useState(12);

  const effDisp: DisplacementKey = isKei ? 'kei' : disp;
  const effMonths = plan === 'simple' ? 12 : months;
  const feeExcl = enabled && !isImport && eligible
    ? domesticWarrantyFee(effDisp, vehicle.year, vehicle.mileageKm, plan, effMonths)
    : null;
  const feeIncl = feeExcl != null ? Math.round(feeExcl * TAX) : null;

  const planLabel = WARRANTY_PLANS.find((p) => p.key === plan)?.label ?? '';
  useEffect(() => {
    if (enabled && feeIncl) onChange(feeIncl, `保証 ${planLabel}・${effMonths >= 24 ? '2年' : '1年'}`);
    else onChange(0, '');
  }, [enabled, feeIncl, planLabel, effMonths, onChange]);

  return (
    <div className={`rounded-xl border-2 p-3 transition ${enabled ? 'border-navy-400 bg-navy-50' : 'border-slate-200'}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy-800">故障保証をつける</span>
            {enabled && feeIncl != null && <span className="text-sm font-bold text-accent-600">{formatYen(feeIncl)}<span className="text-[10px] font-normal text-slate-400">（税込）</span></span>}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">年式・走行距離・排気量から料金表で自動計算</p>
        </div>
      </label>

      {enabled && (
        <div className="mt-3 space-y-2 pl-7">
          {isImport ? (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">輸入車の保証は準備中です（別途お見積り）。</p>
          ) : !eligible ? (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">この車両は保証対象外です（13年超 または 13万km超）。</p>
          ) : (
            <>
              {/* 排気量 */}
              <div>
                <span className="mb-1 block text-[11px] font-bold text-slate-500">排気量</span>
                <div className="flex flex-wrap gap-1.5">
                  {DISPLACEMENTS.map((d) => (
                    <button type="button" key={d.key} disabled={isKei && d.key !== 'kei'}
                      onClick={() => setDisp(d.key)}
                      className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition disabled:opacity-40 ${effDisp === d.key ? 'border-navy-500 bg-white text-navy-700' : 'border-slate-200 text-slate-500'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                {isKei && <p className="mt-0.5 text-[10px] text-slate-400">※ 軽自動車で自動選択</p>}
              </div>
              {/* プラン */}
              <div>
                <span className="mb-1 block text-[11px] font-bold text-slate-500">プラン</span>
                <div className="flex flex-wrap gap-1.5">
                  {WARRANTY_PLANS.map((p) => (
                    <button type="button" key={p.key} onClick={() => setPlan(p.key)}
                      className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${plan === p.key ? 'border-navy-500 bg-white text-navy-700' : 'border-slate-200 text-slate-500'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 期間 */}
              <div>
                <span className="mb-1 block text-[11px] font-bold text-slate-500">保証期間</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setMonths(12)}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${effMonths === 12 ? 'border-navy-500 bg-white text-navy-700' : 'border-slate-200 text-slate-500'}`}>1年</button>
                  <button type="button" onClick={() => setMonths(24)} disabled={plan === 'simple'}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition disabled:opacity-40 ${effMonths === 24 ? 'border-navy-500 bg-white text-navy-700' : 'border-slate-200 text-slate-500'}`}>2年</button>
                </div>
                {plan === 'simple' && <p className="mt-0.5 text-[10px] text-slate-400">※ シンプルは1年のみ</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
