'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, BellOff, ExternalLink, TrendingDown } from 'lucide-react';
import { formatYen } from '@/lib/format';

type Alert = {
  id: string;
  title: string;
  currentPrice: number;
  targetPrice: number;
  createdAt: string;
};

const STORAGE_KEY = 'buymo_price_alerts';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Alert[];
      setAlerts(stored);
    } catch {}
  }, []);

  function remove(id: string) {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  if (!mounted) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-black">値下げ通知</h1>
      </div>

      <p className="text-sm text-slate-500">
        設定した価格以下になった車両をお知らせします。通知はこのデバイスに保存されます。
      </p>

      {alerts.length === 0 ? (
        <div className="card p-10 text-center">
          <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">値下げ通知はまだ設定されていません</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            気になる車両のページから「値下げ通知」ボタンで設定できます
          </p>
          <Link href="/listings" className="btn-primary text-sm">
            車を探す
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const saving = a.currentPrice - a.targetPrice;
            const pct = Math.round((saving / a.currentPrice) * 100);
            return (
              <div key={a.id} className="card p-4 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <TrendingDown className="h-5 w-5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy-800 truncate">{a.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-slate-500">
                      現在 <span className="font-bold text-navy-700">{formatYen(a.currentPrice)}</span>
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="text-slate-500">
                      通知 <span className="font-bold text-amber-600">{formatYen(a.targetPrice)}</span>
                      <span className="ml-1 text-xs text-slate-400">(-{pct}% / -{formatYen(saving)})</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    設定日: {new Date(a.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/listings/${a.id}`}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> 見る
                  </Link>
                  <button
                    onClick={() => remove(a.id)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <BellOff className="h-3.5 w-3.5" /> 解除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-bold mb-1">通知について</p>
        <p className="text-xs text-amber-700">
          値下げ通知はこのデバイスのブラウザに保存されます。
          プッシュ通知を有効にすると、価格変更時にスマートフォンにも通知が届きます。
        </p>
      </div>
    </div>
  );
}
