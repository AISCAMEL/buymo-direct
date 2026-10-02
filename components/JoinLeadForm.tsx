'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitLead } from '@/app/join/actions';
import { LEAD_WISH_LABEL } from '@/lib/membership';

export function JoinLeadForm({ source = 'join' }: { source?: string }) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await submitLead(new FormData(e.currentTarget));
    setSaving(false);
    if (!res.ok) { setError(res.error ?? '送信に失敗しました'); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <p className="text-lg font-black text-emerald-700">お申し込みありがとうございます</p>
        <p className="mt-1 text-sm text-slate-500">担当より通常1〜3営業日でご連絡します。まずは無料でプロ登録・スキル提供から始められます。</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <input type="hidden" name="source" value={source} />
      {/* ハニーポット（ボット対策・人には非表示） */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>Website<input type="text" name="website2" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div>
        <label className="label">お名前 *</label>
        <input name="name" required className="input" placeholder="例）山田 太郎" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">メールアドレス *</label>
          <input name="email" type="email" required className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label">電話番号</label>
          <input name="phone" type="tel" className="input" placeholder="09000000000" />
        </div>
      </div>
      <div>
        <label className="label">ご希望</label>
        <select name="business_type_wish" className="input" defaultValue="pro">
          {Object.entries(LEAD_WISH_LABEL).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">ご質問・ご要望</label>
        <textarea name="message" rows={3} className="input" placeholder="取り扱い車種・エリア・気になる点など" />
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-accent w-full disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? '送信中…' : '無料で申し込む'}
      </button>
      <p className="text-center text-xs text-slate-400">登録は無料です。まずはプロとしてスキル提供から始められます。</p>
    </form>
  );
}
