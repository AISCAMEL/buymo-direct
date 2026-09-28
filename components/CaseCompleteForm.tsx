'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { partnerCompleteCase } from '@/app/cases/actions';

/**
 * 案件を「完了」にして成約金額を入力するフォーム。
 * 入力額からマッチング手数料をリアルタイムに試算して表示する。
 */
export function CaseCompleteForm({
  caseId,
  category,
  rate,
  minFee,
  taxRate,
}: {
  caseId: string;
  category: string;
  rate: number;      // 適用料率（0.10 = 10%）
  minFee: number;    // 最低手数料（税抜）
  taxRate: number;   // 消費税率
}) {
  const [amount, setAmount] = useState<number>(0);
  const [open, setOpen] = useState(false);

  const raw = Math.round(amount * rate);
  const feeExcl = amount > 0 ? Math.max(raw, minFee) : 0;
  const tax = Math.round(feeExcl * taxRate);
  const total = feeExcl + tax;
  const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
      >
        完了・成約金額を入力
      </button>
    );
  }

  return (
    <form action={partnerCompleteCase.bind(null, caseId)} className="w-full space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
      <div>
        <label className="text-xs font-bold text-slate-600">成約金額（税込・円）</label>
        <input
          type="number"
          name="amount"
          min={0}
          step={100}
          required
          value={amount || ''}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          placeholder="例: 30000"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-md bg-white p-3 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>カテゴリー</span>
          <span className="font-bold">{category}（料率 {(rate * 100).toFixed(1)}%）</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>マッチング手数料（税抜）</span>
          <span className="font-bold">{yen(feeExcl)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>消費税</span>
          <span>{yen(tax)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-sm">
          <span className="font-bold text-slate-700">本部へのお支払い（税込）</span>
          <span className="font-black text-navy-700">{yen(total)}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          ※ 手数料はBUYMO経由の取引成立に対する成果報酬です。金額を確定すると請求が作成されます。
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={amount <= 0}
          className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          完了して手数料を確定
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
