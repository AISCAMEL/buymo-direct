'use client';

import { useState } from 'react';
import { ShieldCheck, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { formatYen } from '@/lib/format';

type Status = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';

type Request = {
  id: string; maker: string; model: string; year: number; mileage_km: number;
  ai_price_min: number; ai_price_max: number; buyback_price: number;
  status: Status; seller_name: string; created_at: string;
};

const DEMO: Request[] = [
  { id: 'bb-001', maker: 'スバル', model: 'フォレスター', year: 2018, mileage_km: 71000, ai_price_min: 1600000, ai_price_max: 1900000, buyback_price: 1350000, status: 'pending', seller_name: '田中 太郎', created_at: '2026-06-28' },
  { id: 'bb-002', maker: 'トヨタ', model: 'プリウス', year: 2020, mileage_km: 55000, ai_price_min: 2000000, ai_price_max: 2400000, buyback_price: 1800000, status: 'in_review', seller_name: '佐藤 花子', created_at: '2026-06-25' },
  { id: 'bb-003', maker: 'ホンダ', model: 'フィット', year: 2019, mileage_km: 62000, ai_price_min: 1100000, ai_price_max: 1500000, buyback_price: 975000, status: 'approved', seller_name: '鈴木 一郎', created_at: '2026-06-18' },
  { id: 'bb-004', maker: '日産', model: 'ノート', year: 2017, mileage_km: 89000, ai_price_min: 800000, ai_price_max: 1100000, buyback_price: 712500, status: 'rejected', seller_name: '高橋 美咲', created_at: '2026-06-10' },
  { id: 'bb-005', maker: 'マツダ', model: 'CX-5', year: 2021, mileage_km: 33000, ai_price_min: 2700000, ai_price_max: 3100000, buyback_price: 2250000, status: 'completed', seller_name: '山田 健', created_at: '2026-05-30' },
];

const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: React.ComponentType<{className?: string}> }> = {
  pending:   { label: '申請受付中', cls: 'text-amber-700 bg-amber-50',   icon: Clock },
  in_review: { label: '審査中',    cls: 'text-navy-700 bg-navy-50',     icon: Eye },
  approved:  { label: '承認済み',  cls: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
  rejected:  { label: '不承認',   cls: 'text-red-700 bg-red-50',       icon: XCircle },
  completed: { label: '買取完了',  cls: 'text-slate-600 bg-slate-100',  icon: CheckCircle2 },
};

export default function AdminBuybackPage() {
  const [requests, setRequests] = useState<Request[]>(DEMO);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const detail = requests.find(r => r.id === detailId);

  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
    in_review: requests.filter(r => r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
  };

  async function updateStatus(id: string, status: Status) {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 800));
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setDetailId(null);
    setRejectReason('');
    setProcessing(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          <h1 className="text-2xl font-black">買取保証管理</h1>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '申請受付中', count: counts.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: '審査中', count: counts.in_review, color: 'text-navy-700', bg: 'bg-navy-50' },
          { label: '承認済み', count: counts.approved, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-4 text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'in_review', 'approved', 'rejected', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              filter === f ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'すべて' : STATUS_CONFIG[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              {['車両', '出品者', '保証買取価格', 'AI査定', 'ステータス', '申請日', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => {
              const st = STATUS_CONFIG[r.status];
              const Icon = st.icon;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy-800">{r.maker} {r.model}</p>
                    <p className="text-xs text-slate-400">{r.year}年 / {r.mileage_km.toLocaleString()}km</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.seller_name}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{formatYen(r.buyback_price)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatYen(r.ai_price_min)}〜{formatYen(r.ai_price_max)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>
                      <Icon className="h-3 w-3" />{st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.created_at}</td>
                  <td className="px-4 py-3">
                    {(r.status === 'pending' || r.status === 'in_review') && (
                      <button onClick={() => setDetailId(r.id)}
                        className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800">
                        審査する
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">該当する申請はありません</div>
        )}
      </div>

      {/* 審査モーダル */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !processing && setDetailId(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-navy-800 mb-4">買取保証審査</h3>

            <div className="rounded-xl bg-slate-50 p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">車両</span><span className="font-bold">{detail.maker} {detail.model}（{detail.year}年式）</span></div>
              <div className="flex justify-between"><span className="text-slate-500">走行距離</span><span>{detail.mileage_km.toLocaleString()}km</span></div>
              <div className="flex justify-between"><span className="text-slate-500">出品者</span><span>{detail.seller_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">AI査定</span><span>{formatYen(detail.ai_price_min)}〜{formatYen(detail.ai_price_max)}</span></div>
              <div className="flex justify-between border-t pt-2 mt-1">
                <span className="font-bold text-navy-800">買取保証価格</span>
                <span className="text-xl font-black text-emerald-600">{formatYen(detail.buyback_price)}</span>
              </div>
            </div>

            {detail.status === 'pending' && (
              <button onClick={() => updateStatus(detail.id, 'in_review')} disabled={processing}
                className="w-full mb-2 rounded-xl bg-navy-600 py-2.5 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-50">
                {processing ? '処理中...' : '審査開始（in_review に変更）'}
              </button>
            )}

            <button onClick={() => updateStatus(detail.id, 'approved')} disabled={processing}
              className="w-full mb-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {processing ? '処理中...' : `✅ 承認する（${formatYen(detail.buyback_price)}で買取）`}
            </button>

            <div className="mb-2">
              <input className="input mb-1.5 text-sm" placeholder="不承認理由（任意）"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              <button onClick={() => updateStatus(detail.id, 'rejected')} disabled={processing}
                className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {processing ? '処理中...' : '❌ 不承認'}
              </button>
            </div>

            <button onClick={() => setDetailId(null)} disabled={processing}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}
