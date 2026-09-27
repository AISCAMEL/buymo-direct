'use client';

import { useState } from 'react';
import { Handshake } from 'lucide-react';
import { requestPartner } from '@/app/cases/actions';
import { skillLabel } from '@/lib/cases';

/** 加盟店プロフィールの「このプロに依頼」CTA＋依頼フォーム。 */
export function RequestPartnerForm({ dealerId, skillKeys }: { dealerId: string; skillKeys: string[] }) {
  const [open, setOpen] = useState(false);
  const options = skillKeys.length ? skillKeys : ['appraisal', 'maintenance', 'other'];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex w-full items-center justify-center gap-2 py-3 text-base sm:w-auto sm:px-8"
      >
        <Handshake className="h-5 w-5" /> このプロに依頼する
      </button>
    );
  }

  return (
    <form action={requestPartner} className="card space-y-3 p-4">
      <input type="hidden" name="dealer_id" value={dealerId} />
      <h3 className="font-bold text-navy-800">このプロに依頼</h3>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-slate-500">依頼内容</span>
        <select name="type" className="input h-10 text-sm" defaultValue={options[0]}>
          {options.map((k) => (<option key={k} value={k}>{skillLabel(k)}</option>))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-slate-500">ご要望・車種・希望日など（任意）</span>
        <textarea name="detail" rows={3} className="input text-sm" placeholder="例）トヨタ プリウス（2019年）の車検をお願いしたいです。来週末希望。" />
      </label>
      <div className="flex gap-2">
        <button className="btn-accent flex-1 py-2.5">依頼を送信</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 text-sm text-slate-500 hover:bg-slate-50">キャンセル</button>
      </div>
      <p className="text-[11px] text-slate-400">送信後、加盟店とチャットで詳細を調整できます（要ログイン）。案件は「マイページ＞依頼中案件」で確認できます。</p>
    </form>
  );
}
