'use client';

import { useState } from 'react';
import { Loader2, Building2, CreditCard, Landmark } from 'lucide-react';
import { formatYen } from '@/lib/format';
import { computeFranchiseFee, type FranchisePaymentMethod } from '@/lib/franchise';
import { submitFranchise } from '@/app/franchise/actions';

export function FranchiseApplyForm({
  joiningFee,
  surchargeRate,
  surchargePercentLabel,
}: {
  joiningFee: number;
  surchargeRate: number;
  surchargePercentLabel: string;
}) {
  const [method, setMethod] = useState<FranchisePaymentMethod>('invoice');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fee = computeFranchiseFee(joiningFee, surchargeRate, method);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set('payment_method', method);
    const res = await submitFranchise(fd);
    setSaving(false);
    if (res && !res.ok) setError(res.error ?? '送信に失敗しました');
    // 成功時はサーバー側で /franchise?applied=1 にリダイレクト
  }

  const opt = (m: FranchisePaymentMethod) =>
    `flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-bold transition ${
      method === m ? 'border-gold-500 bg-gold-50 text-gold-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* 支払い方法 */}
      <div>
        <p className="label mb-2">お支払い方法</p>
        <div className="flex gap-3">
          <label className={opt('invoice')}>
            <input type="radio" name="pm" className="hidden" checked={method === 'invoice'} onChange={() => setMethod('invoice')} />
            <Landmark className="mx-auto mb-1 h-5 w-5" /> 単発請求<br /><span className="text-xs font-medium text-slate-400">銀行振込</span>
          </label>
          <label className={opt('card')}>
            <input type="radio" name="pm" className="hidden" checked={method === 'card'} onChange={() => setMethod('card')} />
            <CreditCard className="mx-auto mb-1 h-5 w-5" /> クレジット<br /><span className="text-xs font-medium text-slate-400">Square</span>
          </label>
        </div>
      </div>

      {/* 金額内訳 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between py-1"><span className="text-slate-500">加盟金</span><span className="font-bold tabular-nums">{formatYen(fee.joiningFee)}</span></div>
        {method === 'card' && (
          <div className="flex justify-between py-1 text-slate-500">
            <span>カード決済手数料（{surchargePercentLabel}）</span><span className="tabular-nums">＋{formatYen(fee.surcharge)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-base">
          <span className="font-black">お支払い総額</span><span className="font-black tabular-nums text-navy-700">{formatYen(fee.total)}</span>
        </div>
        {method === 'invoice'
          ? <p className="mt-2 text-xs text-slate-400">銀行振込は手数料の上乗せはありません。</p>
          : <p className="mt-2 text-xs text-slate-400">クレジット決済のみ {surchargePercentLabel} を上乗せして請求します。</p>}
      </div>

      {/* 事業者情報 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">屋号・会社名</label><input name="company_name" className="input" placeholder="例）BUYMO自動車" /></div>
        <div><label className="label">ご担当者名 *</label><input name="contact_name" required className="input" placeholder="例）山田 太郎" /></div>
        <div><label className="label">電話番号</label><input name="phone" type="tel" className="input" placeholder="09000000000" /></div>
        <div><label className="label">都道府県</label><input name="prefecture" className="input" placeholder="例）東京都" /></div>
      </div>
      <div><label className="label">ご質問・ご要望</label><textarea name="note" rows={2} className="input" placeholder="任意" /></div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-accent w-full py-3.5 text-base disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        <Building2 className="h-4 w-4" />
        {saving ? '送信中…' : 'この内容で加盟を申し込む'}
      </button>
      <p className="text-center text-xs text-slate-400">お申し込み後、本部より請求・お手続きのご案内をします。加盟後は月会費 {formatYen(33000)}（税込）です。</p>
    </form>
  );
}
