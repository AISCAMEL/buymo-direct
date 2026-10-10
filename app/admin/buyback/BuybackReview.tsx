'use client';

import { useState } from 'react';
import { formatYen } from '@/lib/format';
import { updateBuybackStatus } from './actions';

export type AdminBuybackRow = {
  id: string;
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  ai_price_min: number;
  ai_price_max: number;
  buyback_price: number;
  status: string;
  seller_name: string;
  created_at: string;
  from_pref: string | null;
  base_pref: string;
  transport_estimate: number;
  transport_fee: number | null;
  payout_amount: number | null;
};

export function BuybackReviewButton({ row }: { row: AdminBuybackRow }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 遠方の陸送費（控除）。確定済みがあればそれを、なければ目安を初期値に。
  const [transport, setTransport] = useState<number>(row.transport_fee ?? row.transport_estimate ?? 0);

  const payout = Math.max(0, row.buyback_price - (Number(transport) || 0));

  async function submit(status: string) {
    setSubmitting(true);
    const fd = new FormData();
    fd.set('id', row.id);
    fd.set('status', status);
    fd.set('transport_fee', String(Math.max(0, Math.round(Number(transport) || 0))));
    if (status === 'rejected') fd.set('rejection_reason', reason);
    await updateBuybackStatus(fd);
    setSubmitting(false);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
      >
        審査する
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-navy-800 mb-4">買取保証審査</h3>

            <div className="rounded-xl bg-slate-50 p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">車両</span><span className="font-bold">{row.maker} {row.model}（{row.year}年式）</span></div>
              <div className="flex justify-between"><span className="text-slate-500">走行距離</span><span>{row.mileage_km.toLocaleString()}km</span></div>
              <div className="flex justify-between"><span className="text-slate-500">出品者</span><span>{row.seller_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">AI査定</span><span>{formatYen(row.ai_price_min)}〜{formatYen(row.ai_price_max)}</span></div>
              <div className="flex justify-between border-t pt-2 mt-1">
                <span className="font-bold text-navy-800">買取保証価格</span>
                <span className="text-xl font-black text-emerald-600">{formatYen(row.buyback_price)}</span>
              </div>
            </div>

            {/* 遠方の陸送費控除 */}
            <div className="rounded-xl border border-slate-200 p-4 mb-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">発送元 → 拠点</span>
                <span className="font-bold">{row.from_pref || '（未登録）'} → {row.base_pref}</span>
              </div>
              <label className="block">
                <span className="text-slate-500">陸送費（遠方のみ控除・目安 {formatYen(row.transport_estimate)}）</span>
                <input
                  type="number" min={0} step={1000} inputMode="numeric"
                  className="input mt-1 text-sm"
                  value={transport}
                  onChange={(e) => setTransport(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                />
                <span className="mt-1 block text-xs text-slate-400">近隣（陸送不要）なら 0 円に。保証額から差し引いて取引します。</span>
              </label>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold text-navy-800">実支払額（保証額 − 陸送費）</span>
                <span className="text-lg font-black text-emerald-600">{formatYen(payout)}</span>
              </div>
            </div>

            {row.status === 'pending' && (
              <button onClick={() => submit('in_review')} disabled={submitting}
                className="w-full mb-2 rounded-xl bg-navy-600 py-2.5 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-50">
                {submitting ? '処理中...' : '審査開始（審査中に変更）'}
              </button>
            )}

            <button onClick={() => submit('approved')} disabled={submitting}
              className="w-full mb-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? '処理中...' : `✅ 承認する（${formatYen(payout)}で買取）`}
            </button>

            {row.status === 'approved' && (
              <button onClick={() => submit('completed')} disabled={submitting}
                className="w-full mb-2 rounded-xl bg-slate-700 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {submitting ? '処理中...' : '買取完了にする'}
              </button>
            )}

            <div className="mb-2">
              <input className="input mb-1.5 text-sm" placeholder="不承認理由（任意）"
                value={reason} onChange={(e) => setReason(e.target.value)} />
              <button onClick={() => submit('rejected')} disabled={submitting}
                className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {submitting ? '処理中...' : '❌ 不承認'}
              </button>
            </div>

            <button onClick={() => setOpen(false)} disabled={submitting}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">キャンセル</button>
          </div>
        </div>
      )}
    </>
  );
}
