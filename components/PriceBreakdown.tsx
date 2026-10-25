'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Receipt, Wallet, CreditCard } from 'lucide-react';
import { computeQuote } from '@/lib/fees';
import { LOAN_TERMS } from '@/lib/loan';
import { LOAN_APR_FROM } from '@/lib/constants';
import { WarrantyPicker } from '@/components/WarrantyPicker';
import { PRICING_DEFAULTS, type PricingConfig } from '@/lib/pricing-config';
import { formatYen } from '@/lib/format';

type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null };
type PayMode = 'cash' | 'loan';

/** 商品詳細に置く「お支払い目安」。現金／ローンを切り替えて、ローン時は総合シミュレーションを表示。 */
export function PriceBreakdown({ price, vehicle, pricing = PRICING_DEFAULTS }: { price: number; vehicle: Vehicle; pricing?: PricingConfig }) {
  const isKei = !!vehicle.bodyType && vehicle.bodyType.includes('軽');
  const transferPrice = isKei ? pricing.transferKei : pricing.transferNormal;

  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [warrantyFee, setWarrantyFee] = useState(0);
  const [warrantyLabel, setWarrantyLabel] = useState('');
  const [delivery, setDelivery] = useState(false);
  const [transportFee, setTransportFee] = useState(0);
  const onWarranty = useCallback((fee: number, label: string) => { setWarrantyFee(fee); setWarrantyLabel(label); }, []);

  // ローン入力
  const [downPayment, setDownPayment] = useState(0);
  const [months, setMonths] = useState(60);
  const [apr, setApr] = useState(LOAN_APR_FROM);

  const optionsTotal = transferPrice + warrantyFee + (delivery ? Math.max(0, transportFee) : 0);
  const useLoan = payMode === 'loan';
  const quote = computeQuote({ price, downPayment: useLoan ? downPayment : 0, optionsTotal, useLoan, aprPercent: apr, months }, pricing);

  const totalPayments = useLoan ? downPayment + quote.monthly * months : quote.grandTotal; // お客様が払う総額
  const interest = useLoan ? Math.max(0, quote.monthly * months - quote.financed) : 0;
  const years = Math.round(months / 12 * 10) / 10;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-navy-500" />
        <h3 className="text-sm font-black text-navy-800">お支払い目安</h3>
      </div>

      {/* 支払い方法 */}
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => setPayMode('cash')}
          className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-bold transition ${payMode === 'cash' ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
          <Wallet className="h-4 w-4" /> 現金で購入
        </button>
        <button type="button" onClick={() => setPayMode('loan')}
          className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-bold transition ${payMode === 'loan' ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
          <CreditCard className="h-4 w-4" /> ローンで購入
        </button>
      </div>

      {/* ローン試算（切替直後にまとめて表示） */}
      {useLoan && (
        <div className="mt-3 overflow-hidden rounded-xl border-2 border-navy-500">
          <div className="bg-navy-500 px-3 py-1.5 text-xs font-black text-white">ローン試算（毎月のお支払い）</div>
          <div className="space-y-3 p-3">
            {/* 条件 */}
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-bold text-slate-500">頭金（円）</span>
                <input type="number" min={0} step={10000} className="input h-9 text-sm" value={downPayment || ''} onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))} placeholder="0" />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-bold text-slate-500">支払回数</span>
                <select className="input h-9 text-sm" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                  {LOAN_TERMS.map((t) => <option key={t} value={t}>{t}回</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-bold text-slate-500">年率（%）</span>
                <input type="number" min={0} step={0.1} className="input h-9 text-sm" value={apr} onChange={(e) => setApr(Math.max(0, Number(e.target.value)))} />
              </label>
            </div>
            {/* 結果 */}
            <div className="rounded-lg bg-navy-700 p-3 text-white">
              <div className="flex items-end justify-between">
                <span className="text-xs font-bold text-navy-200">月々のお支払い</span>
                <span className="text-3xl font-black tabular-nums">{formatYen(quote.monthly)}<span className="ml-0.5 text-sm font-bold">/月</span></span>
              </div>
              <p className="mt-0.5 text-right text-[11px] text-navy-200">{months}回払い（{years}年）</p>
              <dl className="mt-2.5 space-y-1 border-t border-white/15 pt-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-navy-200">総支払額（頭金＋分割）</dt><dd className="font-black tabular-nums">{formatYen(totalPayments)}</dd></div>
                <div className="flex justify-between"><dt className="text-navy-200">うち金利（概算）</dt><dd className="tabular-nums">{formatYen(interest)}</dd></div>
                <div className="flex justify-between"><dt className="text-navy-200">借入額（分割元金）</dt><dd className="tabular-nums">{formatYen(quote.financed)}</dd></div>
              </dl>
            </div>
            <p className="text-[10px] text-slate-400">※ 年率は目安（提携ローン {LOAN_APR_FROM}%〜）。実際の金利・回数は審査で決定します。下の保証・受け取り方法を変えると試算に反映されます。</p>
            <Link href={`/loan/apply`} className="btn-outline w-full justify-center py-2.5 text-sm">ローン仮審査にすすむ</Link>
          </div>
        </div>
      )}

      {/* 保証（料金表・自動計算） */}
      <div className="mt-3">
        <WarrantyPicker vehicle={vehicle} onChange={onWarranty} adjustPercent={pricing.warrantyAdjustPercent} />
      </div>

      {/* 受け取り方法 */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => setDelivery(false)}
          className={`rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition ${!delivery ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
          引き取り<span className="ml-1 text-emerald-600">無料</span>
        </button>
        <button type="button" onClick={() => setDelivery(true)}
          className={`rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition ${delivery ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
          陸送でお届け
        </button>
      </div>
      {delivery && (
        <div className="mt-1.5">
          <input type="number" min={0} step={1000} className="input h-9 text-sm" value={transportFee || ''} onChange={(e) => setTransportFee(Math.max(0, Number(e.target.value)))} placeholder="陸送費（円）例）44000" />
          <p className="mt-0.5 text-[11px] text-slate-400"><Link href="/transport" target="_blank" className="text-accent-600 underline">陸送シミュレーション</Link>で金額を確認</p>
        </div>
      )}

      {/* 内訳 */}
      <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">車両価格</dt><dd className="font-bold">{formatYen(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">エスクロー・取引手数料</dt><dd>{formatYen(quote.escrow)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">名義変更代行{isKei ? '（軽）' : '（普通車）'}</dt><dd>{formatYen(transferPrice)}</dd></div>
        {warrantyFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">{warrantyLabel || '保証'}</dt><dd>{formatYen(warrantyFee)}</dd></div>}
        {delivery && transportFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">陸送でお届け</dt><dd>{formatYen(transportFee)}</dd></div>}
        {useLoan && quote.loanFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">ローン事務手数料</dt><dd>{formatYen(quote.loanFee)}</dd></div>}
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-2">
          <dt className="font-black text-navy-800">{useLoan ? '諸費用込み総額' : 'お支払い総額（現金）'}</dt>
          <dd className="font-black text-navy-800">{formatYen(quote.grandTotal)}</dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-slate-400">
        ※ エスクローと名義変更代行は安全のため必ず含まれます。保証は料金表（税込）で自動計算。金額は目安です。
        {!useLoan && ' ローンご希望の方は上の「ローンで購入」をお選びください。'}
      </p>
    </div>
  );
}
