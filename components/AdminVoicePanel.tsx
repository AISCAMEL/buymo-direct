'use client';

import { useState } from 'react';
import { Loader2, PhoneOutgoing } from 'lucide-react';

export function AdminVoicePanel({ restReady }: { restReady: boolean }) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function call() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/voice/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message: message || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; sid?: string; error?: string };
      setResult(data.ok ? `発信しました（通話ID: ${data.sid ?? '―'}）` : `失敗：${data.error ?? '不明なエラー'}`);
    } catch {
      setResult('通信に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold">テスト発信（AIが架電）</h2>
      <p className="mt-1 text-sm text-slate-500">指定の番号へAIが電話をかけ、音声で会話します。</p>
      {!restReady && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          発信には TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER の設定が必要です。
        </p>
      )}
      <div className="mt-3 space-y-2">
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="発信先（例: +8190xxxxxxxx）" className="input h-10 w-full text-sm" />
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="最初のひとこと（任意）" className="input h-10 w-full text-sm" />
        <button onClick={call} disabled={busy || !restReady || !to.trim()} className="btn-accent disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOutgoing className="h-4 w-4" />} この番号に発信
        </button>
      </div>
      {result && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{result}</p>}
    </div>
  );
}
