'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ShieldAlert, Building2, Package, CreditCard,
  FileCheck, Flag, CheckCircle2, XCircle, PauseCircle,
  PlayCircle, Users, TrendingUp, AlertTriangle, Percent,
} from 'lucide-react';
import { DEMO_DEALERS, DEMO_LISTINGS, DEMO_ESCROWS, DEMO_KYCS, DEMO_REPORTS } from '@/lib/demo-data';
import { formatYen } from '@/lib/format';

type Tab = 'dashboard' | 'dealers' | 'listings' | 'escrow' | 'kyc' | 'reports';

const STATUS_LABEL: Record<string, string> = {
  pending: '審査中', approved: '承認済み', suspended: '停止中',
  active: '公開中', reserved: '商談中', sold: '成約済み',
  initiated: '入金待ち', funds_held: '入金済み', inspection: '検査中', completed: '完了', cancelled: 'キャンセル',
  open: '対応中', resolved: '解決済み',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50', approved: 'text-emerald-600 bg-emerald-50',
  suspended: 'text-red-600 bg-red-50', active: 'text-emerald-600 bg-emerald-50',
  reserved: 'text-blue-600 bg-blue-50', sold: 'text-slate-500 bg-slate-100',
  initiated: 'text-amber-600 bg-amber-50', funds_held: 'text-blue-600 bg-blue-50',
  inspection: 'text-purple-600 bg-purple-50', completed: 'text-emerald-600 bg-emerald-50',
  open: 'text-red-600 bg-red-50', resolved: 'text-slate-500 bg-slate-100',
};

export default function DemoAdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dealers, setDealers] = useState(DEMO_DEALERS);
  const [listings, setListings] = useState(DEMO_LISTINGS);
  const [kycs, setKycs] = useState(DEMO_KYCS);
  const [reports, setReports] = useState(DEMO_REPORTS);
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function approveDealer(id: string) {
    setDealers(d => d.map(x => x.id === id ? { ...x, status: 'approved', approved_at: '2026-07-02' } : x));
    notify('加盟店を承認しました');
  }
  function suspendDealer(id: string) {
    setDealers(d => d.map(x => x.id === id ? { ...x, status: 'suspended' } : x));
    notify('加盟店を停止しました');
  }
  function reinstateDealer(id: string) {
    setDealers(d => d.map(x => x.id === id ? { ...x, status: 'approved' } : x));
    notify('停止を解除しました');
  }
  function approveListing(id: string) {
    setListings(l => l.map(x => x.id === id ? { ...x, status: 'active' } : x));
    notify('出品を承認しました');
  }
  function removeListing(id: string) {
    setListings(l => l.filter(x => x.id !== id));
    notify('出品を削除しました');
  }
  function approveKyc(id: string) {
    setKycs(k => k.map(x => x.id === id ? { ...x, status: 'approved' } : x));
    notify('本人確認を承認しました');
  }
  function resolveReport(id: string) {
    setReports(r => r.map(x => x.id === id ? { ...x, status: 'resolved' } : x));
    notify('通報を解決済みにしました');
  }

  const totalGmv = dealers.filter(d => d.status === 'approved').reduce((s, d) => s + d.gmv, 0);
  const pendingDealers = dealers.filter(d => d.status === 'pending').length;
  const pendingKycs = kycs.filter(k => k.status === 'pending').length;
  const openReports = reports.filter(r => r.status === 'open').length;

  const TABS = [
    { key: 'dashboard', label: 'ダッシュボード' },
    { key: 'dealers', label: `加盟店審査 ${pendingDealers > 0 ? `(${pendingDealers})` : ''}` },
    { key: 'listings', label: '出品モデレーション' },
    { key: 'escrow', label: '取引監視' },
    { key: 'kyc', label: `本人確認審査 ${pendingKycs > 0 ? `(${pendingKycs})` : ''}` },
    { key: 'reports', label: `通報 ${openReports > 0 ? `(${openReports})` : ''}` },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-navy-700 px-5 py-3 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-red-500" />
          <span className="text-lg font-black text-navy-800">BUYMO 本部管理コンソール</span>
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">ADMIN</span>
          <span className="ml-auto text-xs text-slate-400">管理者: 管理者 太郎</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Tabs */}
        <nav className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-navy-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black">ダッシュボード</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Building2, label: '承認済み加盟店', value: `${dealers.filter(d => d.status === 'approved').length}社`, sub: `審査待ち ${pendingDealers}件`, color: 'text-navy-600' },
                { icon: Package, label: '公開中出品', value: `${listings.filter(l => l.status === 'active').length}台`, sub: `本日 +${Math.floor(Math.random() * 5) + 2}台`, color: 'text-emerald-600' },
                { icon: TrendingUp, label: '累計GMV', value: formatYen(totalGmv), sub: '全加盟店合計', color: 'text-blue-600' },
                { icon: AlertTriangle, label: '要対応', value: `${pendingKycs + openReports}件`, sub: `KYC ${pendingKycs}件・通報 ${openReports}件`, color: 'text-amber-600' },
              ].map(({ icon: Icon, label, value, sub, color }) => (
                <div key={label} className="card p-5">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-sm font-bold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Recent pending actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <h2 className="mb-3 font-bold text-amber-700">⚠ 審査待ち加盟店</h2>
                <div className="space-y-2">
                  {dealers.filter(d => d.status === 'pending').map(d => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="font-bold">{d.name}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => { approveDealer(d.id); setTab('dealers'); }} className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-emerald-600">承認</button>
                        <button onClick={() => setTab('dealers')} className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold hover:bg-slate-50">詳細</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="mb-3 font-bold text-amber-700">⚠ KYC審査待ち</h2>
                <div className="space-y-2">
                  {kycs.filter(k => k.status === 'pending').map(k => (
                    <div key={k.id} className="flex items-center justify-between text-sm">
                      <span className="font-bold">{k.user}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => { approveKyc(k.id); setTab('kyc'); }} className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-emerald-600">承認</button>
                        <button onClick={() => setTab('kyc')} className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold hover:bg-slate-50">詳細</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEALERS */}
        {tab === 'dealers' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">加盟店管理</h1>
            {dealers.map(d => (
              <div key={d.id} className="card p-5 space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-black">{d.name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                    </div>
                    <p className="text-sm text-slate-500">{d.company_name} / {d.prefecture}</p>
                    <p className="text-xs text-slate-400">オーナー: {d.owner_name} ({d.owner_email})</p>
                  </div>
                  <div className="flex gap-4 text-center text-sm shrink-0">
                    <div><p className="font-black text-navy-700">{d.inventory}</p><p className="text-xs text-slate-400">在庫</p></div>
                    <div><p className="font-black text-navy-700">{d.sold}</p><p className="text-xs text-slate-400">成約</p></div>
                    <div><p className="font-black text-navy-700">{d.commission_rate}%</p><p className="text-xs text-slate-400">手数料</p></div>
                    {d.gmv > 0 && <div><p className="font-black text-navy-700">{formatYen(d.gmv)}</p><p className="text-xs text-slate-400">GMV</p></div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {d.status === 'pending' && (
                    <>
                      <button onClick={() => approveDealer(d.id)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> 承認
                      </button>
                      <button onClick={() => notify('却下メモを送信しました')} className="flex items-center gap-1.5 rounded-lg bg-slate-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600">
                        <XCircle className="h-4 w-4" /> 却下
                      </button>
                    </>
                  )}
                  {d.status === 'approved' && (
                    <button onClick={() => suspendDealer(d.id)} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600">
                      <PauseCircle className="h-4 w-4" /> 停止
                    </button>
                  )}
                  {d.status === 'suspended' && (
                    <button onClick={() => reinstateDealer(d.id)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600">
                      <PlayCircle className="h-4 w-4" /> 停止解除
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Percent className="h-4 w-4 text-slate-400" />
                    <input type="number" defaultValue={d.commission_rate} step="0.1" min="0" max="100" className="input w-20 py-1 text-sm" />
                    <button onClick={() => notify('手数料率を更新しました')} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-bold hover:bg-slate-50">変更</button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">申込: {d.created_at}{d.approved_at && ` / 承認: ${d.approved_at}`}</p>
              </div>
            ))}
          </div>
        )}

        {/* LISTINGS */}
        {tab === 'listings' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">出品モデレーション</h1>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">車両</th>
                    <th className="px-4 py-3 text-left">価格</th>
                    <th className="px-4 py-3 text-left">都道府県</th>
                    <th className="px-4 py-3 text-left">加盟店</th>
                    <th className="px-4 py-3 text-center">ステータス</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listings.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold">{l.title}</p>
                        <p className="text-xs text-slate-400">{l.year}年 / {l.mileage_km.toLocaleString()}km</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-navy-700">{formatYen(l.price)}</td>
                      <td className="px-4 py-3 text-slate-500">{l.prefecture}</td>
                      <td className="px-4 py-3 text-slate-500">{l.dealer_id ? '加盟店' : '個人'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {l.status !== 'active' && (
                            <button onClick={() => approveListing(l.id)} className="rounded bg-emerald-500 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-600">承認</button>
                          )}
                          <button onClick={() => removeListing(l.id)} className="rounded bg-red-500 px-2 py-1 text-xs font-bold text-white hover:bg-red-600">削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ESCROW */}
        {tab === 'escrow' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">取引監視</h1>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">車両</th>
                    <th className="px-4 py-3 text-left">買主 → 売主</th>
                    <th className="px-4 py-3 text-right">金額</th>
                    <th className="px-4 py-3 text-center">ステータス</th>
                    <th className="px-4 py-3 text-left">開始日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_ESCROWS.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold">{e.listing_title}</p>
                        {e.dealer && <p className="text-xs text-slate-400">{e.dealer}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{e.buyer} → {e.seller}</td>
                      <td className="px-4 py-3 text-right font-bold text-navy-700">{formatYen(e.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{e.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KYC */}
        {tab === 'kyc' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">本人確認審査</h1>
            <div className="space-y-3">
              {kycs.map(k => (
                <div key={k.id} className="card flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <FileCheck className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{k.user}</p>
                    <p className="text-sm text-slate-500">{k.doc_type} / 提出: {k.submitted}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[k.status]}`}>{STATUS_LABEL[k.status]}</span>
                  {k.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => approveKyc(k.id)} className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600">承認</button>
                      <button onClick={() => notify('却下しました')} className="rounded bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600">却下</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">通報管理</h1>
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="card flex items-center gap-4 p-4">
                  <Flag className={`h-5 w-5 shrink-0 ${r.status === 'open' ? 'text-red-500' : 'text-slate-300'}`} />
                  <div className="flex-1">
                    <p className="font-bold">{r.type}</p>
                    {r.listing && <p className="text-sm text-slate-500">対象出品: {r.listing}</p>}
                    <p className="text-xs text-slate-400">通報者: {r.reporter} / {r.created_at}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  {r.status === 'open' && (
                    <button onClick={() => resolveReport(r.id)} className="rounded bg-slate-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600">解決済みに</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
