'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { formatYen } from '@/lib/format';

interface Props {
  listingId: string;
  currentPrice: number;
  title: string;
}

export function PriceAlertButton({ listingId, currentPrice, title }: Props) {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(Math.floor(currentPrice * 0.95));
  const [saved, setSaved] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);

  const STORAGE_KEY = 'buymo_price_alerts';

  useEffect(() => {
    try {
      const alerts = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { id: string }[];
      setHasAlert(alerts.some((a) => a.id === listingId));
    } catch {}
  }, [listingId]);

  function save() {
    try {
      const alerts = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as object[];
      const filtered = (alerts as { id: string }[]).filter((a) => a.id !== listingId);
      (filtered as { id: string; title: string; currentPrice: number; targetPrice: number; createdAt: string }[]).push({ id: listingId, title, currentPrice, targetPrice, createdAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {}
    setSaved(true);
    setHasAlert(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  function remove() {
    try {
      const alerts = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { id: string }[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.filter((a) => a.id !== listingId)));
    } catch {}
    setHasAlert(false);
  }

  if (saved) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> アラート設定完了
      </div>
    );
  }

  if (hasAlert) {
    return (
      <button
        onClick={remove}
        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <BellOff className="h-3.5 w-3.5" /> アラート解除
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-amber-300 hover:text-amber-600 transition-colors"
      >
        <Bell className="h-3.5 w-3.5" /> 値下げ通知
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-black text-navy-800">値下げ通知を設定</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              この車両の価格が設定額以下になったときにお知らせします。
            </p>
            <div className="rounded-xl bg-slate-50 p-3 mb-4 text-sm">
              <p className="text-xs text-slate-400 mb-0.5">現在の価格</p>
              <p className="font-black text-navy-700">{formatYen(currentPrice)}</p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 mb-1 block">通知する価格（円）</label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                min={1}
                max={currentPrice - 1}
                step={10000}
                className="input text-sm w-full"
              />
              <p className="text-xs text-slate-400 mt-1">
                現在より {formatYen(currentPrice - targetPrice)} 安くなったら通知
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={save}
                disabled={targetPrice <= 0 || targetPrice >= currentPrice}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                通知を設定する
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
