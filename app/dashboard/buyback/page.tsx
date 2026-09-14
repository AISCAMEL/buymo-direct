'use client';

import { useState } from 'react';
import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatYen } from '@/lib/format';

// デモデータ（DB未接続時）
type DemoListing = {
  id: string; maker: string; model: string; year: number; mileage_km: number;
  price: number; ai_price_min: number; ai_price_max: number;
  status: string; listed_at: string; days_since: number;
};

type DemoRequest = {
  id: string; listing_id: string; maker: string; model: string; year: number;
  buyback_price: number; status: string; created_at: string;
};

const DEMO_LISTINGS: DemoListing[] = [
  { id: 'lst-001', maker: 'トヨタ', model: 'プリウス', year: 2021, mileage_km: 28000, price: 2480000, ai_price_min: 2200000, ai_price_max: 2700000, status: 'active', listed_at: '2026-05-28', days_since: 31 },
  { id: 'lst-002', maker: 'ホンダ', model: 'フィット', year: 2019, mileage_km: 52000, price: 1350000, ai_price_min: 1100000, ai_price_max: 1500000, status: 'active', listed_at: '2026-06-15', days_since: 13 },
  { id: 'lst-003', maker: 'マツダ', model: 'CX-5', year: 2020, mileage_km: 43000, price: 2950000, ai_price_min: 2700000, ai_price_max: 3100000, status: 'sold', listed_at: '2026-05-01', days_since: 58 },
];

const DEMO_REQUESTS: DemoRequest[] = [
  { id: 'bb-001', listing_id: 'lst-004', maker: 'スバル', model: 'フォレスター', year: 2018, buyback_price: 1350000, status: 'approved', created_at: '2026-06-20' },
];

const STATUS_MAP: Record<string, { label: string; icon: React.ComponentType<{className?: string}>; cls: string }> = {
  pending:   { label: '申請受付中', icon: Clock,         cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  in_review: { label: '審査中',    icon: AlertCircle,   cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  approved:  { label: '承認済み',  icon: CheckCircle2,  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rejected:  { label: '不承認',   icon: XCircle,       cls: 'text-red-700 bg-red-50 border-red-200' },
  completed: { label: '買取完了',  icon: CheckCircle2,  cls: 'text-slate-700 bg-slate-50 border-slate-200' },
};

export default function BuybackPage() {
  const [listings] = useState<DemoListing[]>(DEMO_LISTINGS);
  const [requests, setRequests] = useState<DemoRequest[]>(DEMO_REQUESTS);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const eligibleListings = listings.filter(l => l.status === 'active' && l.days_since >= 30 && !applied[l.id]);

  async function handleApply(listing: DemoListing) {
    setApplying(true);
    await new Promise(r => setTimeout(r, 1200)); // デモ: ローディング演出
    const mid = (listing.ai_price_min + listing.ai_price_max) / 2;
    const buybackPrice = Math.round(mid * 0.75 / 10000) * 10000;
    const newReq: DemoRequest = {
      id: 'bb-new-' + listing.id, listing_id: listing.id,
      maker: listing.maker, model: listing.model, year: listing.year,
      buyback_price: buybackPrice, status: 'pending',
      created_at: new Date().toISOString(),
    };
    setRequests(prev => [...prev, newReq]);
    setApplied(prev => ({ ...prev, [listing.id]: true }));
    setConfirmId(null);
    setApplying(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-emerald-500" />
        <div>
          <h1 className="text-2xl font-black text-navy-800">買取保証</h1>
          <p className="text-sm text-slate-500">30日間売れなかった出品にBUYMOが買取保証を提供します</p>
        </div>
      </div>

      {/* 仕組み説明 */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-700 mb-4">買取保証の仕組み</h2>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {[
            { step: '1', icon: '📋', label: '出品', desc: '30日間C2Cで販売' },
            { step: '2', icon: '🛡️', label: '申請', desc: '30日経過後に申請' },
            { step: '3', icon: '💰', label: '買取', desc: 'AI査定の75%で買取' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center gap-2">
              <div className="text-3xl">{s.icon}</div>
              <div className="font-bold text-navy-800">{s.label}</div>
              <div className="text-xs text-slate-500">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          ※ 買取価格はAI査定額の中央値×75%。実車確認後に正式金額を確定します。
        </div>
      </div>

      {/* 申請可能な出品 */}
      {eligibleListings.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="rounded-full bg-emerald-500 h-2 w-2" />
            買取保証を申請できる出品
          </h2>
          <div className="space-y-3">
            {eligibleListings.map(l => {
              const mid = (l.ai_price_min + l.ai_price_max) / 2;
              const buyback = Math.round(mid * 0.75 / 10000) * 10000;
              return (
                <div key={l.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-navy-800">{l.maker} {l.model}</p>
                      <p className="text-sm text-slate-500">{l.year}年式 / {l.mileage_km.toLocaleString()}km</p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                      出品{l.days_since}日経過
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                      <p className="text-xs text-slate-400">出品価格</p>
                      <p className="font-bold text-slate-700">{formatYen(l.price)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                      <p className="text-xs text-slate-400">AI査定</p>
                      <p className="font-bold text-slate-700">{formatYen(l.ai_price_min)}〜</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-center">
                      <p className="text-xs text-emerald-600">保証買取価格</p>
                      <p className="font-bold text-emerald-700">{formatYen(buyback)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmId(l.id)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    買取保証を申請する
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 申請履歴 */}
      <div>
        <h2 className="font-bold text-slate-700 mb-3">申請履歴</h2>
        {requests.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <ShieldCheck className="mx-auto h-10 w-10 mb-2 opacity-30" />
            <p>まだ申請はありません</p>
            <p className="text-xs mt-1">出品後30日経過すると申請できるようになります</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const st = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
              const Icon = st.icon;
              return (
                <div key={r.id} className={`card border p-4 ${r.status === 'approved' ? 'border-emerald-200' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-navy-800">{r.maker} {r.model}（{r.year}年式）</p>
                      <p className="text-sm text-slate-500">申請日: {r.created_at.slice(0, 10)}</p>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${st.cls}`}>
                      <Icon className="h-3.5 w-3.5" />{st.label}
                    </span>
                  </div>
                  {r.status === 'approved' && (
                    <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">買取承認！</p>
                        <p className="text-sm text-emerald-700">買取価格: <strong>{formatYen(r.buyback_price)}</strong> — 担当者が3営業日以内に連絡します</p>
                      </div>
                    </div>
                  )}
                  {r.status === 'pending' && (
                    <p className="mt-2 text-xs text-slate-400">通常3〜5営業日以内に審査します</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 確認モーダル */}
      {confirmId && (() => {
        const l = listings.find(x => x.id === confirmId)!;
        const mid = (l.ai_price_min + l.ai_price_max) / 2;
        const buyback = Math.round(mid * 0.75 / 10000) * 10000;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
            onClick={() => !applying && setConfirmId(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-black text-navy-800 mb-1">買取保証を申請しますか？</h3>
              <p className="text-sm text-slate-500 mb-4">{l.maker} {l.model}（{l.year}年式）</p>
              <div className="rounded-xl bg-slate-50 p-4 mb-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">AI査定額</span><span className="font-bold">{formatYen(l.ai_price_min)}〜{formatYen(l.ai_price_max)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">保証率</span><span className="font-bold">75%</span></div>
                <div className="flex justify-between border-t pt-2 mt-1">
                  <span className="font-bold text-navy-800">買取保証価格</span>
                  <span className="text-xl font-black text-emerald-600">{formatYen(buyback)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-5">申請後、担当者が実車確認を経て最終金額を確定します。</p>
              <div className="space-y-2">
                <button onClick={() => handleApply(l)} disabled={applying}
                  className="btn-primary w-full disabled:opacity-50">
                  {applying ? '申請中...' : '申請する'}
                </button>
                <button onClick={() => setConfirmId(null)} disabled={applying}
                  className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">キャンセル</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
