'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitLoanApplication } from '@/app/loan/actions';
import { LOAN_APR_FROM } from '@/lib/constants';
import { LOAN_TERMS, monthlyPayment } from '@/lib/loan';
import { formatYen } from '@/lib/format';

const EMPLOYMENTS = ['正社員', '契約・派遣', '自営業', 'パート・アルバイト', '年金', 'その他'];

export function LoanApplyForm({
  listingId,
  listingTitle,
  defaultPrice,
  defaultEmail,
}: {
  listingId?: string;
  listingTitle?: string;
  defaultPrice: number;
  defaultEmail: string;
}) {
  const [price, setPrice] = useState(defaultPrice);
  const [down, setDown] = useState(0);
  const [term, setTerm] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const financed = Math.max(0, price - Math.max(0, down));
  const monthly = monthlyPayment(financed, LOAN_APR_FROM, term);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await submitLoanApplication({
      listingId,
      fullName: String(fd.get('full_name')),
      phone: String(fd.get('phone')),
      email: String(fd.get('email')),
      birthYear: fd.get('birth_year') ? Number(fd.get('birth_year')) : undefined,
      annualIncome: fd.get('annual_income') ? Number(fd.get('annual_income')) : undefined,
      employment: String(fd.get('employment')) || undefined,
      vehiclePrice: price,
      downPayment: down,
      termMonths: term,
      note: String(fd.get('note')) || undefined,
    });
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else {
      setDoneId(res.id ?? 'ok');
    }
  }

  if (doneId) {
    return (
      <div className="card space-y-3 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-black">仮審査の申込を受け付けました</h2>
        <p className="text-sm text-slate-600">
          提携ローン会社の審査結果は、メール・お電話でご連絡します。
          審査状況はマイページでも確認できます。
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Link href="/dashboard/loans" className="btn-primary">申込状況を見る</Link>
          <Link href="/listings" className="btn-outline">車を探す</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 試算 */}
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">借入条件・試算</h2>
        {listingTitle && <p className="text-sm text-slate-500">対象車両：{listingTitle}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="font-bold text-slate-700">車両価格(円)</span>
            <input type="number" min={1} className="input mt-1" value={price || ''} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} />
          </label>
          <label className="text-xs">
            <span className="font-bold text-slate-700">頭金(円)</span>
            <input type="number" min={0} max={price} step={10000} className="input mt-1" value={down || ''} onChange={(e) => setDown(Math.max(0, Number(e.target.value)))} placeholder="0" />
          </label>
          <label className="text-xs">
            <span className="font-bold text-slate-700">支払回数</span>
            <select className="input mt-1" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
              {LOAN_TERMS.map((m) => <option key={m} value={m}>{m}回</option>)}
            </select>
          </label>
        </div>
        <div className="rounded-lg bg-navy-50 p-3 text-center">
          <span className="text-xs text-slate-500">月々のお支払い（年率{LOAN_APR_FROM}%目安）</span>
          <p className="text-2xl font-black text-navy-600">{formatYen(monthly)}<span className="text-sm">/月</span></p>
          <span className="text-xs text-slate-400">融資額 {formatYen(financed)}</span>
        </div>
      </div>

      {/* 申込者情報 */}
      <div className="card space-y-4 p-5">
        <h2 className="font-bold">お客様情報</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">氏名 *</label>
            <input name="full_name" required className="input" placeholder="山田 太郎" />
          </div>
          <div>
            <label className="label">電話番号 *</label>
            <input name="phone" required type="tel" className="input" placeholder="09012345678" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">メールアドレス *</label>
            <input name="email" required type="email" className="input" defaultValue={defaultEmail} />
          </div>
          <div>
            <label className="label">生年（西暦）</label>
            <input name="birth_year" type="number" min={1940} max={2010} className="input" placeholder="1990" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">年収（万円）</label>
            <input name="annual_income" type="number" min={0} step={10} className="input" placeholder="400" />
          </div>
          <div>
            <label className="label">雇用形態</label>
            <select name="employment" className="input">
              <option value="">選択してください</option>
              {EMPLOYMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">ご要望・備考</label>
          <textarea name="note" rows={3} className="input" placeholder="希望条件・連絡可能な時間帯など" />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <p className="text-xs text-slate-400">
        ※ これは提携ローン会社への仮審査申込です。最終的な金利・借入可否は審査により決定します。
        入力内容は審査目的で提携先に提供されます。
      </p>

      <button type="submit" disabled={busy} className="btn-accent w-full py-3 text-base">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} 仮審査を申し込む
      </button>
    </form>
  );
}
