'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { computeQuote } from '@/lib/fees';
import { WarrantyPicker } from '@/components/WarrantyPicker';
import { PRICING_DEFAULTS, type PricingConfig } from '@/lib/pricing-config';
import { formatYen } from '@/lib/format';

type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null };

/** 商品詳細に置く「現金でのお支払い目安」。エスクロー＋名義変更（必須）＋保証(任意)＋受け取り方法。 */
export function PriceBreakdown({ price, vehicle, pricing = PRICING_DEFAULTS }: { price: number; vehicle: Vehicle; pricing?: PricingConfig }) {
  const isKei = !!vehicle.bodyType && vehicle.bodyType.includes('軽');
  const transferPrice = isKei ? pricing.transferKei : pricing.transferNormal;

  const [warrantyFee, setWarrantyFee] = useState(0);
  const [warrantyLabel, setWarrantyLabel] = useState('');
  const [delivery, setDelivery] = useState(false);
  const [transportFee, setTransportFee] = useState(0);
  const onWarranty = useCallback((fee: number, label: string) => { setWarrantyFee(fee); setWarrantyLabel(label); }, []);

  const optionsTotal = transferPrice + warrantyFee + (delivery ? Math.max(0, transportFee) : 0);
  const quote = computeQuote({ price, downPayment: 0, optionsTotal, useLoan: false, aprPercent: 0, months: 0 }, pricing);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-navy-500" />
        <h3 className="text-sm font-black text-navy-800">現金でのお支払い目安</h3>
      </div>

      {/* 保証（料金表・自動計算） */}
      <WarrantyPicker vehicle={vehicle} onChange={onWarranty} adjustPercent={pricing.warrantyAdjustPercent} />

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
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-2">
          <dt className="font-black text-navy-800">お支払い総額（現金）</dt>
          <dd className="font-black text-navy-800">{formatYen(quote.grandTotal)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-slate-400">※ エスクローと名義変更代行は安全のため必ず含まれます。保証は国産の料金表（税込）で自動計算。金額は目安です。ローンご希望の方は上の「ローン仮審査」からどうぞ。</p>
    </div>
  );
}
