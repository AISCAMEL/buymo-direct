'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldPlus, Check } from 'lucide-react';
import { WarrantyPicker } from '@/components/WarrantyPicker';
import { setEscrowOptions } from '@/app/escrow/actions';
import { formatYen } from '@/lib/format';

type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null; displacementCc?: number | null };
type SavedOption = { key: string; label: string; amount: number };

/** 取引（エスクロー）に保証・車庫証明などの追加オプションを保存するUI。
 *  買主が取引開始前（initiated）にのみ利用でき、保存すると支払総額へ反映される。 */
export function EscrowOptionsPicker({
  escrowId,
  vehicle,
  warrantyAdjustPercent = 0,
  garageProofFee = 0,
  saved = [],
}: {
  escrowId: string;
  vehicle: Vehicle;
  warrantyAdjustPercent?: number;
  garageProofFee?: number;
  saved?: SavedOption[];
}) {
  const router = useRouter();
  const [warrantyFee, setWarrantyFee] = useState(0);
  const [warrantyLabel, setWarrantyLabel] = useState('');
  const [garage, setGarage] = useState(saved.some((o) => o.key === 'garage'));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // WarrantyPicker からの税込料金・ラベル通知（mount時の 0 通知も含む）
  const onWarranty = useCallback((fee: number, label: string) => {
    setWarrantyFee(fee);
    setWarrantyLabel(label);
    setDone(false);
  }, []);

  const selected: SavedOption[] = [];
  if (warrantyFee > 0) selected.push({ key: 'warranty', label: warrantyLabel || '故障保証', amount: warrantyFee });
  if (garage && garageProofFee > 0) selected.push({ key: 'garage', label: '車庫証明代行', amount: garageProofFee });
  const selectedTotal = selected.reduce((s, o) => s + o.amount, 0);
  const savedTotal = saved.reduce((s, o) => s + o.amount, 0);
  const willClear = selected.length === 0 && saved.length > 0;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setEscrowOptions(escrowId, selected);
      if (res.error) { setError(res.error); return; }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-1.5 font-bold">
        <ShieldPlus className="h-5 w-5 text-navy-600" /> 追加オプション（保証・車庫証明）
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        故障保証や車庫証明の代行を取引に追加できます。<span className="font-bold text-navy-700">「この内容で保存」</span>を押すと、お支払い総額に反映されます。
      </p>

      {saved.length > 0 && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="flex items-center gap-1 font-bold text-emerald-700"><Check className="h-4 w-4" /> 現在のオプション</p>
          <ul className="mt-1 space-y-0.5">
            {saved.map((o) => (
              <li key={o.key} className="flex justify-between text-emerald-800">
                <span>{o.label}</span><span className="font-bold">{formatYen(o.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-emerald-200 pt-0.5 font-bold text-emerald-800">
              <span>合計</span><span>{formatYen(savedTotal)}</span>
            </li>
          </ul>
          <p className="mt-1 text-[11px] text-emerald-600">※ 変更する場合は下で選び直して保存してください。</p>
        </div>
      )}

      {/* 故障保証 */}
      <div className="mt-4">
        <WarrantyPicker vehicle={vehicle} onChange={onWarranty} adjustPercent={warrantyAdjustPercent} />
      </div>

      {/* 車庫証明代行 */}
      {garageProofFee > 0 && (
        <label className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${garage ? 'border-navy-400 bg-navy-50' : 'border-slate-200'}`}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={garage} onChange={(e) => { setGarage(e.target.checked); setDone(false); }} />
          <div className="flex-1">
            <span className="text-sm font-bold text-navy-800">車庫証明の取得を代行する</span>
            <p className="mt-0.5 text-[11px] text-slate-400">必要書類の作成・警察署での手続きを代行します。</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-accent-600">{formatYen(garageProofFee)}</span>
        </label>
      )}

      {/* 選択中の合計＋保存 */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="font-bold text-slate-600">選択中の追加合計</span>
        <span className="font-black text-navy-700">{formatYen(selectedTotal)}</span>
      </div>

      {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
      {done && !error && <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">オプションを保存しました。お支払い内訳に反映されています。</p>}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="btn-accent mt-3 w-full py-3 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
        {willClear ? 'オプションを削除して保存' : 'この内容で保存'}
      </button>
    </div>
  );
}
