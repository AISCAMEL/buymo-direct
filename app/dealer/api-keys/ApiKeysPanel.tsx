'use client';

import { useState, useTransition } from 'react';
import { Key, Webhook, Trash2, ToggleLeft, ToggleRight, Copy, CheckCircle2, Plus } from 'lucide-react';

// Renders client-side to show the newly-generated API key once
export function ApiKeysPanel({
  apiKeys,
  webhooks,
  isOwner,
}: {
  apiKeys: { id: string; name: string; key_prefix: string; last_used_at: string | null; created_at: string }[];
  webhooks: { id: string; url: string; events: string[]; active: boolean; secret: string; created_at: string }[];
  isOwner: boolean;
}) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleCreateKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await fetch('/api/dealer/create-apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fd.get('name') }),
      });
      const json = await res.json();
      if (json.plain) setNewKey(json.plain);
      (e.target as HTMLFormElement).reset();
    });
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">API キー / Webhook</h1>

      {/* API キー */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-navy-500" />
          <h2 className="font-bold">API キー（在庫システム連携）</h2>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
          <p className="font-bold text-slate-700">使い方</p>
          <p className="text-slate-500">外部の在庫管理システム（DMS）から <code className="rounded bg-slate-200 px-1">POST /api/dealer/inventory</code> へリクエストを送ると在庫を一括同期できます。</p>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-emerald-300">{`curl -X POST https://your-domain/api/dealer/inventory \\
  -H "X-Dealer-API-Key: bmc_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '[{"title":"...","maker":"トヨタ","model":"プリウス","year":2022,"mileage_km":15000,"price":2500000,"prefecture":"東京都"}]'`}</pre>
        </div>

        {newKey && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-2 text-sm font-bold text-emerald-700">APIキーが生成されました（一度限り表示）</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-sm font-mono">{newKey}</code>
              <button onClick={copyKey} className="btn-outline shrink-0">
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-emerald-600">このキーは再表示できません。必ず今すぐコピーしてください。</p>
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleCreateKey} className="flex gap-2">
            <input name="name" required className="input flex-1" placeholder="キー名（例: 本社DMS連携）" />
            <button type="submit" disabled={pending} className="btn-accent shrink-0">
              <Plus className="h-4 w-4" /> 生成
            </button>
          </form>
        )}

        {apiKeys.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2 text-left">キー名</th>
                <th className="pb-2 text-left">プレフィックス</th>
                <th className="pb-2 text-left">最終利用</th>
                {isOwner && <th className="pb-2 text-center">削除</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiKeys.map((k) => (
                <tr key={k.id}>
                  <td className="py-2 font-bold">{k.name}</td>
                  <td className="py-2 font-mono text-slate-500">{k.key_prefix}…</td>
                  <td className="py-2 text-slate-400">{k.last_used_at ? k.last_used_at.slice(0, 10) : '未使用'}</td>
                  {isOwner && (
                    <td className="py-2 text-center">
                      <button
                        onClick={() => fetch(`/api/dealer/create-apikey?id=${k.id}`, { method: 'DELETE' }).then(() => location.reload())}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Webhook */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-navy-500" />
          <h2 className="font-bold">Webhook（取引完了通知）</h2>
        </div>
        <p className="text-sm text-slate-500">
          成約完了 (<code>deal.completed</code>) などのイベントが発生すると、設定した URL に POST します。
          署名は <code>X-BUYMO-Signature</code> ヘッダ（HMAC-SHA256）で検証できます。
        </p>

        {isOwner && (
          <form action="/api/dealer/webhook" method="POST" className="flex flex-col gap-2 sm:flex-row">
            <input name="url" type="url" required className="input flex-1" placeholder="https://your-system.com/webhook" />
            <input name="events" className="input w-48" defaultValue="deal.completed" placeholder="deal.completed,*" />
            <button type="submit" className="btn-accent shrink-0"><Plus className="h-4 w-4" /> 追加</button>
          </form>
        )}

        {webhooks.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2 text-left">URL</th>
                <th className="pb-2 text-left">イベント</th>
                <th className="pb-2 text-center">状態</th>
                {isOwner && <th className="pb-2 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {webhooks.map((wh) => (
                <tr key={wh.id}>
                  <td className="py-2 max-w-64 truncate font-mono text-xs">{wh.url}</td>
                  <td className="py-2 text-slate-500">{wh.events.join(', ')}</td>
                  <td className="py-2 text-center">
                    {wh.active ? <ToggleRight className="h-5 w-5 text-emerald-500 inline" /> : <ToggleLeft className="h-5 w-5 text-slate-400 inline" />}
                  </td>
                  {isOwner && (
                    <td className="py-2 text-center">
                      <button
                        onClick={() => fetch(`/api/dealer/webhook?id=${wh.id}`, { method: 'DELETE' }).then(() => location.reload())}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
