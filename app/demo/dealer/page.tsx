'use client';

import { useState } from 'react';
import {
  Package, Users, TrendingUp, Key, Webhook,
  Plus, Trash2, ToggleRight, ToggleLeft, Copy,
  CheckCircle2, BarChart3, Settings, ShieldCheck,
} from 'lucide-react';
import {
  DEMO_LISTINGS, DEMO_STAFF, DEMO_ANALYTICS,
  DEMO_API_KEYS, DEMO_WEBHOOKS,
} from '@/lib/demo-data';
import { formatYen } from '@/lib/format';

type Tab = 'dashboard' | 'listings' | 'staff' | 'analytics' | 'apikeys' | 'settings';

const STATUS_LABEL: Record<string, string> = {
  active: '公開中', reserved: '商談中', sold: '成約済み', draft: '下書き',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'text-emerald-600 bg-emerald-50', reserved: 'text-blue-600 bg-blue-50',
  sold: 'text-slate-500 bg-slate-100', draft: 'text-amber-600 bg-amber-50',
};
const ROLE_LABEL: Record<string, string> = { owner: 'オーナー', manager: 'マネージャー', staff: 'スタッフ' };
const ROLE_COLOR: Record<string, string> = {
  owner: 'text-red-600 bg-red-50', manager: 'text-blue-600 bg-blue-50', staff: 'text-slate-600 bg-slate-100',
};

const maxBar = Math.max(...DEMO_ANALYTICS.map(a => a.gmv));

export default function DemoDealerPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [listings, setListings] = useState(DEMO_LISTINGS.filter(l => l.dealer_id === 'dlr-001'));
  const [staff, setStaff] = useState(DEMO_STAFF);
  const [apiKeys, setApiKeys] = useState(DEMO_API_KEYS);
  const [webhooks, setWebhooks] = useState(DEMO_WEBHOOKS);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  const gmv = 87400000;
  const commission = gmv * 0.03;
  const activeCount = listings.filter(l => l.status === 'active').length;
  const soldCount = listings.filter(l => l.status === 'sold').length;

  const filteredListings = statusFilter === 'all' ? listings : listings.filter(l => l.status === statusFilter);

  function generateKey() {
    const plain = 'bmc_' + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
    setNewKeyPlain(plain);
    setApiKeys(k => [...k, { id: 'key-new', name: '新しいキー', prefix: plain.slice(0, 12), last_used: null, created: '2026-07-02' }]);
    notify('APIキーを生成しました');
  }
  function deleteKey(id: string) { setApiKeys(k => k.filter(x => x.id !== id)); notify('削除しました'); }
  function addWebhook() {
    if (!webhookUrl.startsWith('https://')) { notify('HTTPS URLが必要です'); return; }
    setWebhooks(w => [...w, { id: 'wh-new', url: webhookUrl, events: ['deal.completed'], active: true, created: '2026-07-02' }]);
    setWebhookUrl('');
    notify('Webhookを追加しました');
  }
  function deleteWebhook(id: string) { setWebhooks(w => w.filter(x => x.id !== id)); notify('削除しました'); }
  function toggleWebhook(id: string) { setWebhooks(w => w.map(x => x.id === id ? { ...x, active: !x.active } : x)); }
  function inviteStaff() {
    if (!inviteEmail.includes('@')) { notify('メールアドレスを入力してください'); return; }
    setStaff(s => [...s, { id: 'stf-new', name: inviteEmail.split('@')[0], email: inviteEmail, role: 'staff', joined: '2026-07-02', last_login: '—' }]);
    setInviteEmail('');
    notify(`${inviteEmail} に招待メールを送信しました`);
  }
  function removeListing(id: string) { setListings(l => l.filter(x => x.id !== id)); notify('削除しました'); }
  function copyKey() {
    if (!newKeyPlain) return;
    navigator.clipboard.writeText(newKeyPlain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const TABS = [
    { key: 'dashboard', label: 'ダッシュボード', icon: TrendingUp },
    { key: 'listings', label: `在庫管理 (${listings.length})`, icon: Package },
    { key: 'staff', label: `スタッフ (${staff.length})`, icon: Users },
    { key: 'analytics', label: 'アナリティクス', icon: BarChart3 },
    { key: 'apikeys', label: 'API / Webhook', icon: Key },
    { key: 'settings', label: '店舗設定', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-navy-700 px-5 py-3 text-sm font-bold text-white shadow-lg">{toast}</div>}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center gap-3">
          <Package className="h-6 w-6 text-navy-500" />
          <span className="text-lg font-black text-navy-800">カーズ東京 新宿店</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">承認済み</span>
          <span className="ml-auto text-xs text-slate-400">山田 花子（オーナー）</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Tabs */}
        <nav className="flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${tab === key ? 'bg-navy-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black">ダッシュボード</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: '公開中在庫', value: `${activeCount}台`, sub: '本日 +2台', color: 'text-navy-700' },
                { label: '成約件数', value: `${soldCount}台`, sub: '今月 +3台', color: 'text-emerald-600' },
                { label: '成約 GMV', value: formatYen(gmv), sub: '累計', color: 'text-blue-600' },
                { label: '手数料（推計）', value: formatYen(commission), sub: '3.0%', color: 'text-amber-600' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="card p-5">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-sm font-bold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <h2 className="mb-3 font-bold">クイックアクション</h2>
                <div className="space-y-2">
                  <button onClick={() => setTab('listings')} className="btn-accent block w-full text-center text-sm">在庫を管理する</button>
                  <button onClick={() => setTab('apikeys')} className="btn-outline block w-full text-center text-sm">API キー / Webhook</button>
                  <button onClick={() => notify('出品フォームへ移動します')} className="btn-outline block w-full text-center text-sm">新規在庫を出品する</button>
                </div>
              </div>
              <div className="card p-5">
                <h2 className="mb-3 font-bold">加盟店情報</h2>
                <dl className="space-y-1 text-sm">
                  {[
                    ['店舗名', 'カーズ東京 新宿店'],
                    ['法人名', '株式会社カーズジャパン'],
                    ['都道府県', '東京都'],
                    ['ステータス', '承認済み'],
                    ['成約手数料率', '3.0%'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* LISTINGS */}
        {tab === 'listings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">在庫管理</h1>
              <button onClick={() => notify('出品フォームへ移動します')} className="btn-accent flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> 新規出品
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'reserved', 'sold'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${statusFilter === s ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  {s === 'all' ? 'すべて' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">車両</th>
                    <th className="px-4 py-3 text-right">価格</th>
                    <th className="px-4 py-3 text-center">ステータス</th>
                    <th className="px-4 py-3 text-left">登録日</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredListings.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold">{l.title}</p>
                        <p className="text-xs text-slate-400">{l.year}年 / {l.mileage_km.toLocaleString()}km / {l.color}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-navy-700">{formatYen(l.price)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{l.created_at}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => notify('編集フォームへ')} className="rounded bg-slate-100 px-2 py-1 text-xs font-bold hover:bg-slate-200">編集</button>
                          <button onClick={() => removeListing(l.id)} className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100">削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STAFF */}
        {tab === 'staff' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">スタッフ管理</h1>
            <div className="card p-5 space-y-4">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-2 text-left">名前</th>
                    <th className="pb-2 text-left">メール</th>
                    <th className="pb-2 text-center">役割</th>
                    <th className="pb-2 text-left">最終ログイン</th>
                    <th className="pb-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td className="py-2 font-bold">{s.name}</td>
                      <td className="py-2 text-slate-500 text-xs">{s.email}</td>
                      <td className="py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_COLOR[s.role]}`}>{ROLE_LABEL[s.role]}</span>
                      </td>
                      <td className="py-2 text-slate-400 text-xs">{s.last_login}</td>
                      <td className="py-2 text-center">
                        {s.role !== 'owner' && (
                          <button onClick={() => { setStaff(st => st.filter(x => x.id !== s.id)); notify('スタッフを削除しました'); }}
                            className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 border-t border-slate-100 pt-4">
                <input
                  type="email" placeholder="招待するメールアドレス"
                  className="input flex-1"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
                <button onClick={inviteStaff} className="btn-accent flex items-center gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" /> 招待
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black">アナリティクス</h1>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: '累計GMV', value: formatYen(gmv) },
                { label: '累計成約', value: '38台' },
                { label: '手数料（累計）', value: formatYen(commission) },
              ].map(({ label, value }) => (
                <div key={label} className="card p-5">
                  <p className="text-2xl font-black text-navy-700">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-bold">月次 GMV 推移</h2>
              <div className="space-y-3">
                {DEMO_ANALYTICS.map(a => (
                  <div key={a.month} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0 text-slate-500">{a.month.slice(0, 7)}</span>
                    <div className="flex-1 rounded-full bg-slate-100 h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-navy-500 flex items-center justify-end pr-2"
                        style={{ width: `${(a.gmv / maxBar) * 100}%` }}>
                        <span className="text-xs font-bold text-white">{formatYen(a.gmv)}</span>
                      </div>
                    </div>
                    <span className="w-12 shrink-0 text-right text-slate-400">{a.sold}台</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API KEYS */}
        {tab === 'apikeys' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black">API キー / Webhook</h1>

            {/* API Keys */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-navy-500" />
                <h2 className="font-bold">API キー（在庫システム連携）</h2>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
                <p className="font-bold text-slate-700">使い方</p>
                <p className="text-slate-500">外部DMS から <code className="rounded bg-slate-200 px-1">POST /api/dealer/inventory</code> へ在庫を一括同期できます。</p>
                <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-emerald-300">{`curl -X POST https://buymo.me/api/dealer/inventory \\
  -H "X-Dealer-API-Key: bmc_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '[{"title":"...","maker":"トヨタ","model":"プリウス","year":2022,"mileage_km":15000,"price":2500000,"prefecture":"東京都"}]'`}</pre>
              </div>

              {newKeyPlain && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="mb-2 text-sm font-bold text-emerald-700">APIキーが生成されました（一度限り表示）</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-sm font-mono">{newKeyPlain}</code>
                    <button onClick={copyKey} className="btn-outline shrink-0">
                      {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-emerald-600">このキーは再表示できません。今すぐコピーしてください。</p>
                </div>
              )}

              <div className="flex gap-2">
                <input className="input flex-1" placeholder="キー名（例: 本社DMS連携）" />
                <button onClick={generateKey} className="btn-accent shrink-0 flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> 生成
                </button>
              </div>

              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-2 text-left">キー名</th>
                    <th className="pb-2 text-left">プレフィックス</th>
                    <th className="pb-2 text-left">最終利用</th>
                    <th className="pb-2 text-center">削除</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiKeys.map(k => (
                    <tr key={k.id}>
                      <td className="py-2 font-bold">{k.name}</td>
                      <td className="py-2 font-mono text-slate-500">{k.prefix}…</td>
                      <td className="py-2 text-slate-400">{k.last_used ?? '未使用'}</td>
                      <td className="py-2 text-center">
                        <button onClick={() => deleteKey(k.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Webhooks */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-navy-500" />
                <h2 className="font-bold">Webhook（取引完了通知）</h2>
              </div>
              <p className="text-sm text-slate-500">成約完了 (<code>deal.completed</code>) 時にPOST。<code>X-BUYMO-Signature</code> (HMAC-SHA256) で検証可能。</p>

              <div className="flex gap-2">
                <input type="url" placeholder="https://your-system.com/webhook" className="input flex-1"
                  value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                <button onClick={addWebhook} className="btn-accent shrink-0 flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> 追加
                </button>
              </div>

              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-2 text-left">URL</th>
                    <th className="pb-2 text-left">イベント</th>
                    <th className="pb-2 text-center">状態</th>
                    <th className="pb-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooks.map(wh => (
                    <tr key={wh.id}>
                      <td className="py-2 max-w-64 truncate font-mono text-xs">{wh.url}</td>
                      <td className="py-2 text-slate-500">{wh.events.join(', ')}</td>
                      <td className="py-2 text-center">
                        <button onClick={() => toggleWebhook(wh.id)}>
                          {wh.active ? <ToggleRight className="h-5 w-5 text-emerald-500 inline" /> : <ToggleLeft className="h-5 w-5 text-slate-400 inline" />}
                        </button>
                      </td>
                      <td className="py-2 text-center">
                        <button onClick={() => deleteWebhook(wh.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">店舗設定</h1>
            <div className="card p-5 space-y-4">
              <h2 className="font-bold">店舗情報</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: '店舗名', value: 'カーズ東京 新宿店', name: 'name' },
                  { label: '法人名', value: '株式会社カーズジャパン', name: 'company_name' },
                  { label: '都道府県', value: '東京都', name: 'prefecture' },
                  { label: '住所', value: '新宿区西新宿2-1-1', name: 'address' },
                  { label: '電話番号', value: '03-1234-5678', name: 'phone' },
                  { label: 'ウェブサイト', value: 'https://cars-tokyo.example.com', name: 'website_url' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="mb-1 block text-sm font-bold text-slate-700">{f.label}</label>
                    <input defaultValue={f.value} className="input w-full" />
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">店舗紹介</label>
                <textarea defaultValue="東京・新宿で30年の実績を持つ認定中古車専門店。全車両に走行距離保証付き。" rows={3} className="input w-full" />
              </div>
              <button onClick={() => notify('店舗情報を保存しました')} className="btn-accent">保存する</button>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-bold text-slate-500">本部設定（読み取り専用）</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">成約手数料率</dt>
                  <dd className="font-bold">3.0%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">ステータス</dt>
                  <dd className="font-bold text-emerald-600">承認済み</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">承認日</dt>
                  <dd className="font-bold">2026-01-15</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
