'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, ShieldCheck, Info } from 'lucide-react';
import { submitLoanApplication } from '@/app/loan/actions';
import { LOAN_APR_FROM } from '@/lib/constants';
import { LOAN_TERMS } from '@/lib/loan';
import { computeQuote } from '@/lib/fees';
import { estimateWarranty, WARRANTY_MONTHS } from '@/lib/warranty';
import { PRICING_DEFAULTS, type PricingConfig } from '@/lib/pricing-config';
import { formatYen } from '@/lib/format';

const EMPLOYMENTS = ['正社員', '契約・派遣', '自営業', 'パート・アルバイト', '年金', 'その他'];

type Vehicle = { year?: number; mileageKm?: number; maker?: string; bodyType?: string };

export function LoanApplyForm({
  listingId,
  listingTitle,
  defaultPrice,
  defaultEmail,
  vehicle = {},
  pricing = PRICING_DEFAULTS,
}: {
  listingId?: string;
  listingTitle?: string;
  defaultPrice: number;
  defaultEmail: string;
  vehicle?: Vehicle;
  pricing?: PricingConfig;
}) {
  const [price, setPrice] = useState(defaultPrice);
  const [down, setDown] = useState(0);
  const [term, setTerm] = useState(60);

  // 名義変更は必須（自動加算）。軽/普通車で金額が変わる。
  const isKei = !!vehicle.bodyType && vehicle.bodyType.includes('軽');
  const transferPrice = isKei ? pricing.transferKei : pricing.transferNormal;
  // 選択オプション
  const [optWarranty, setOptWarranty] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [optTransport, setOptTransport] = useState(false);
  const [transportFee, setTransportFee] = useState(0);

  const canWarranty = !!(vehicle.year && vehicle.mileageKm);
  const warrantyPrice = optWarranty && canWarranty
    ? (estimateWarranty({ ...vehicle, months: warrantyMonths }, pricing) ?? 0)
    : 0;

  // 名義変更（必須）＋選択OPの合計
  const optionsTotal =
    transferPrice +
    (optWarranty ? warrantyPrice : 0) +
    (optTransport ? Math.max(0, transportFee) : 0);

  const quote = computeQuote({ price, downPayment: down, optionsTotal, useLoan: true, aprPercent: LOAN_APR_FROM, months: term }, pricing);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  function breakdownText(): string {
    const lines = [
      '【お支払い内訳（目安）】',
      `車両価格: ${formatYen(price)}`,
      `エスクロー・取引手数料: ${formatYen(quote.escrow)}`,
      `名義変更代行${isKei ? '（軽）' : '（普通車）'}: ${formatYen(transferPrice)}`,
    ];
    if (optWarranty && warrantyPrice) lines.push(`保証(${warrantyMonths}ヶ月): ${formatYen(warrantyPrice)}`);
    lines.push(optTransport ? `陸送でお届け: ${formatYen(Math.max(0, transportFee))}` : '受け取り: 自分で引き取り（陸送なし）');
    lines.push(`ローン手数料(3.6%): ${formatYen(quote.loanFee)}`);
    lines.push(`お支払い総額: ${formatYen(quote.grandTotal)}`);
    lines.push(`頭金: ${formatYen(down)} / 融資額: ${formatYen(quote.financed)} / ${term}回 / 月々 ${formatYen(quote.monthly)}`);
    return lines.join('\n');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const userNote = String(fd.get('note') || '').trim();
    const note = [userNote, breakdownText()].filter(Boolean).join('\n\n');
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
      escrowFee: quote.escrow,
      optionsTotal,
      loanFee: quote.loanFee,
      note,
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
        <h2 className="text-xl font-black">お申し込みを受け付けました</h2>
        <p className="text-sm text-slate-600">
          この内容で受付しました。<strong>担当が正式な申請フォームをメールでお送りします</strong>ので、
          ご記入・ご返送ください。審査状況はマイページでも確認できます。
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
            <input type="number" min={0} step={10000} className="input mt-1" value={down || ''} onChange={(e) => setDown(Math.max(0, Number(e.target.value)))} placeholder="0" />
          </label>
          <label className="text-xs">
            <span className="font-bold text-slate-700">支払回数</span>
            <select className="input mt-1" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
              {LOAN_TERMS.map((m) => <option key={m} value={m}>{m}回</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* 自動で含まれるもの＋オプション */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-navy-500" />
          <h2 className="font-bold">安心の取引（自動で含まれます）</h2>
        </div>
        <div className="space-y-2">
          {/* 必須：エスクロー */}
          <div className="flex items-start justify-between rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3">
            <div>
              <p className="text-sm font-bold text-navy-800">エスクロー・取引手数料 <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">必須</span></p>
              <p className="mt-0.5 text-xs text-slate-500">代金を安全にお預かりする仕組み</p>
            </div>
            <span className="text-sm font-bold text-accent-600">{formatYen(quote.escrow)}</span>
          </div>
          {/* 必須：名義変更 */}
          <div className="flex items-start justify-between rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3">
            <div>
              <p className="text-sm font-bold text-navy-800">名義変更代行{isKei ? '（軽自動車）' : '（普通車・車庫証明込み）'} <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">必須</span></p>
              <p className="mt-0.5 text-xs text-slate-500">名義変更をしないと税金・責任が売主に残るため、必ず行います</p>
            </div>
            <span className="text-sm font-bold text-accent-600">{formatYen(transferPrice)}</span>
          </div>
        </div>

        <h2 className="pt-2 font-bold">オプション（必要に応じて選択）</h2>
        <div className="space-y-2">
          {/* 保証 */}
          <div className={`rounded-xl border-2 p-3 transition ${optWarranty ? 'border-navy-400 bg-navy-50' : 'border-slate-200'}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={optWarranty} disabled={!canWarranty} onChange={(e) => setOptWarranty(e.target.checked)} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-navy-800">故障保証（年式・走行距離で自動計算）</span>
                  {optWarranty && canWarranty && <span className="text-sm font-bold text-accent-600">{formatYen(warrantyPrice)}</span>}
                </div>
                {!canWarranty && <p className="mt-0.5 text-xs text-slate-400">※ 車両を選択して申し込むと保証を追加できます</p>}
              </div>
            </label>
            {optWarranty && canWarranty && (
              <div className="mt-2 flex flex-wrap gap-2 pl-7">
                {WARRANTY_MONTHS.map((m) => (
                  <button type="button" key={m} onClick={() => setWarrantyMonths(m)}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${warrantyMonths === m ? 'border-navy-500 bg-white text-navy-700' : 'border-slate-200 text-slate-500'}`}>
                    {m}ヶ月
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 受け取り方法（引き取り or 陸送でお届け） */}
          <div className="rounded-xl border-2 border-slate-200 p-3">
            <p className="text-sm font-bold text-navy-800">車の受け取り方法</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setOptTransport(false)}
                className={`rounded-xl border-2 p-3 text-left transition ${!optTransport ? 'border-navy-500 bg-navy-50' : 'border-slate-200'}`}>
                <p className="text-sm font-bold text-navy-800">自分で引き取り</p>
                <p className="text-xs text-slate-500">出品者のもとへ受け取りに行く</p>
                <p className="mt-1 text-sm font-bold text-emerald-600">無料</p>
              </button>
              <button type="button" onClick={() => setOptTransport(true)}
                className={`rounded-xl border-2 p-3 text-left transition ${optTransport ? 'border-navy-500 bg-navy-50' : 'border-slate-200'}`}>
                <p className="text-sm font-bold text-navy-800">陸送でお届け</p>
                <p className="text-xs text-slate-500">自宅など指定場所へお届け（ZERO手配）</p>
                <p className="mt-1 text-sm font-bold text-accent-600">{optTransport && transportFee > 0 ? formatYen(transportFee) : '料金を入力'}</p>
              </button>
            </div>
            {optTransport && (
              <div className="mt-2">
                <p className="mb-1 text-xs text-slate-500">
                  金額は<Link href="/transport" target="_blank" className="text-accent-600 underline">陸送シミュレーション</Link>でご確認のうえ入力してください
                </p>
                <input type="number" min={0} step={1000} className="input w-40" value={transportFee || ''} onChange={(e) => setTransportFee(Math.max(0, Number(e.target.value)))} placeholder="例）44000" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 合計（自動計算） */}
      <div className="card space-y-2 p-5">
        <h2 className="font-bold">お支払い総額（自動計算）</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">車両価格</dt><dd className="font-bold">{formatYen(price)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500 inline-flex items-center gap-1">エスクロー・取引手数料<Info className="h-3 w-3 text-slate-400" /></dt><dd className="font-bold">{formatYen(quote.escrow)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">名義変更代行{isKei ? '（軽）' : '（普通車）'}</dt><dd className="font-bold">{formatYen(transferPrice)}</dd></div>
          {optWarranty && canWarranty && <div className="flex justify-between"><dt className="text-slate-500">保証（{warrantyMonths}ヶ月）</dt><dd>{formatYen(warrantyPrice)}</dd></div>}
          {optTransport && transportFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">陸送でお届け</dt><dd>{formatYen(transportFee)}</dd></div>}
          <div className="flex justify-between"><dt className="text-slate-500">ローン手数料（3.6%）</dt><dd className="font-bold">{formatYen(quote.loanFee)}</dd></div>
          <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-base">
            <dt className="font-black text-navy-800">お支払い総額</dt>
            <dd className="font-black text-navy-800">{formatYen(quote.grandTotal)}</dd>
          </div>
        </dl>
        <div className="mt-2 rounded-lg bg-navy-50 p-3 text-center">
          <span className="text-xs text-slate-500">月々のお支払い（年率{LOAN_APR_FROM}%目安・頭金{formatYen(down)}）</span>
          <p className="text-2xl font-black text-navy-600">{formatYen(quote.monthly)}<span className="text-sm">/月</span></p>
          <span className="text-xs text-slate-400">融資額 {formatYen(quote.financed)} / {term}回</span>
        </div>
        <p className="text-xs text-slate-400">※ ローン購入ではエスクロー決済が自動で適用されます。金額はすべて目安です。</p>
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
            <label className="label">電話番号</label>
            <input name="phone" type="tel" className="input" placeholder="09012345678（任意）" />
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
        ※ まずはお名前・メールアドレスで受付します。受付後、担当が<strong>正式な申請フォーム</strong>をメールでお送りします。
        金利・借入可否は提携ローン会社の審査により決定します。
      </p>

      <button type="submit" disabled={busy} className="btn-accent w-full py-3 text-base">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} この内容で申し込む（無料）
      </button>
    </form>
  );
}
