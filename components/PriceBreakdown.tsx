'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, Wallet, CreditCard, ArrowRight, PiggyBank } from 'lucide-react';
import { computeQuote } from '@/lib/fees';
import { LOAN_TERMS } from '@/lib/loan';
import { LOAN_APR_FROM } from '@/lib/constants';
import { estimateTransport, TRANSPORT_PREFS, CAR_SIZES } from '@/lib/transport';
import { WarrantyPicker } from '@/components/WarrantyPicker';
import { PRICING_DEFAULTS, type PricingConfig } from '@/lib/pricing-config';
import { formatYen } from '@/lib/format';

type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null; prefecture?: string | null };
type PayMode = 'cash' | 'loan';

/** 車体タイプから陸送のサイズ区分を推定。 */
function sizeFromBody(bodyType?: string | null): string {
  const b = bodyType ?? '';
  if (b.includes('軽')) return 'kei';
  if (b.includes('SUV') || b.includes('ミニバン') || b.includes('ワゴン')) return 'minivan';
  if (b.includes('トラック') || b.includes('1BOX') || b.includes('バン')) return 'large';
  return 'normal';
}

/** 商品詳細に置く「お支払い目安」。流れ：支払い方法 → オプション選択 → (ローンなら試算) → 総額 → ローン審査。 */
export function PriceBreakdown({ price, vehicle, pricing = PRICING_DEFAULTS, listingId }: { price: number; vehicle: Vehicle; pricing?: PricingConfig; listingId?: string }) {
  const isKei = !!vehicle.bodyType && vehicle.bodyType.includes('軽');
  const transferPrice = isKei ? pricing.transferKei : pricing.transferNormal;

  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [warrantyFee, setWarrantyFee] = useState(0);
  const [warrantyLabel, setWarrantyLabel] = useState('');
  const [delivery, setDelivery] = useState(false);
  const [transportFee, setTransportFee] = useState(0);
  const [destPref, setDestPref] = useState('');
  const [garageProof, setGarageProof] = useState(true); // 車庫証明代行（既定で付ける）
  const onWarranty = useCallback((fee: number, label: string) => { setWarrantyFee(fee); setWarrantyLabel(label); }, []);

  // 陸送：出品地域→お届け先・車サイズから自動見積。
  const originPref = vehicle.prefecture ?? '';
  const carSize = sizeFromBody(vehicle.bodyType);
  const carSizeLabel = CAR_SIZES.find((s) => s.value === carSize)?.label ?? '';
  const transportEst = delivery && originPref && destPref ? estimateTransport(originPref, destPref, carSize) : null;
  const transportMid = transportEst ? Math.round(((transportEst.low + transportEst.high) / 2) / 1000) * 1000 : 0;
  useEffect(() => {
    if (transportMid > 0) setTransportFee(transportMid);
  }, [transportMid]);

  // ローン入力
  const [downPayment, setDownPayment] = useState(0);
  const [months, setMonths] = useState(60);
  const [apr, setApr] = useState(LOAN_APR_FROM);

  const garageFee = garageProof ? pricing.garageProofFee : 0;
  const optionsTotal = transferPrice + garageFee + warrantyFee + (delivery ? Math.max(0, transportFee) : 0);
  const useLoan = payMode === 'loan';
  const effApr = Math.max(LOAN_APR_FROM, apr); // 年率は最低基準(提携ローン%)未満にしない
  const quote = computeQuote({ price, downPayment: useLoan ? downPayment : 0, optionsTotal, useLoan, aprPercent: effApr, months }, pricing);

  const totalPayments = useLoan ? downPayment + quote.monthly * months : quote.grandTotal; // お客様が払う総額
  const interest = useLoan ? Math.max(0, quote.monthly * months - quote.financed) : 0;
  const years = Math.round(months / 12 * 10) / 10;

  // おトク比較（手続き代行＝名義変更＋車庫証明）。市場相場＝P2P大手の公表料金ベース（当社調べ）。
  const buymoProc = transferPrice + garageFee;
  const marketProc = pricing.marketNameChange + (garageProof ? pricing.marketGarageProof : 0);
  const savings = Math.max(0, marketProc - buymoProc);

  // ローン申込へシミュレーション値を引き継ぐURL。
  const loanHref = `/loan/apply?${new URLSearchParams({
    ...(listingId ? { listing: listingId } : {}),
    down: String(downPayment),
    term: String(months),
    apr: String(effApr),
    garage: garageProof ? '1' : '0',
    wfee: String(warrantyFee),
    wlabel: warrantyLabel,
    tfee: String(delivery ? Math.max(0, transportFee) : 0),
  }).toString()}`;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-navy-500" />
        <h3 className="text-sm font-black text-navy-800">お支払い目安</h3>
      </div>

      {/* STEP1 支払い方法 */}
      <StepLabel n={1} text="支払い方法をえらぶ" />
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

      {/* STEP2 オプション（現金・ローン共通で選択可） */}
      <div className="mt-4"><StepLabel n={2} text="オプションをえらぶ" /></div>
      <WarrantyPicker vehicle={vehicle} onChange={onWarranty} adjustPercent={pricing.warrantyAdjustPercent} />
      {/* 車庫証明取得代行 */}
      <label className={`mt-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${garageProof ? 'border-navy-400 bg-navy-50' : 'border-slate-200'}`}>
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={garageProof} onChange={(e) => setGarageProof(e.target.checked)} />
        <div className="flex-1">
          <span className="text-sm font-bold text-navy-800">車庫証明取得代行</span>
          <p className="mt-0.5 text-[11px] text-slate-400">陸運局・警察署での手続きを代行。ご自身で取得する場合は外せます。</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-accent-600">{formatYen(pricing.garageProofFee)}</span>
      </label>
      {/* 受け取り方法 */}
      <div className="mt-2">
        <span className="mb-1 block text-[11px] font-bold text-slate-500">受け取り方法</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setDelivery(false)}
            className={`rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition ${!delivery ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
            引き取り<span className="ml-1 text-emerald-600">無料</span>
          </button>
          <button type="button" onClick={() => setDelivery(true)}
            className={`rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition ${delivery ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'}`}>
            陸送でお届け
          </button>
        </div>
      </div>
      {delivery && (
        <div className="mt-1.5 space-y-1.5">
          {originPref ? (
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-bold text-slate-500">お届け先（都道府県）</span>
              <select className="input" value={destPref} onChange={(e) => setDestPref(e.target.value)}>
                <option value="">選択してください（{originPref}発・{carSizeLabel}）</option>
                {TRANSPORT_PREFS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          ) : (
            <p className="text-[11px] text-amber-600">出品地域が未設定のため自動見積できません。金額を直接入力してください。</p>
          )}
          {transportEst && (
            <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-600">
              自動見積：{originPref}→{destPref}（{carSizeLabel}）<span className="text-navy-700"> 約{formatYen(transportEst.low)}〜{formatYen(transportEst.high)}</span>
            </p>
          )}
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-bold text-slate-500">陸送費（自動・手入力でも可）</span>
            <input type="number" min={0} step={1000} className="input" value={transportFee || ''} onChange={(e) => setTransportFee(Math.max(0, Number(e.target.value)))} placeholder="お届け先を選ぶと自動入力" />
          </label>
          <p className="text-[10px] text-slate-400">※ 目安（片道・キャリアカー）。<Link href="/transport" target="_blank" className="text-accent-600 underline">詳細シミュレーション</Link>。離島・特殊車両（ローダウン・旧車等）は変動します。</p>
        </div>
      )}

      {/* STEP3 ローン試算（ローン選択時のみ・オプションの後） */}
      {useLoan && (
        <>
          <div className="mt-4"><StepLabel n={3} text="ローンを試算する" /></div>
          <div className="overflow-hidden rounded-xl border-2 border-navy-500">
            <div className="space-y-2 p-3">
              <label className="block">
                <span className="mb-0.5 block text-[11px] font-bold text-slate-500">頭金（円）</span>
                <input type="number" inputMode="numeric" min={0} step={10000} className="input" value={downPayment || ''} onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))} placeholder="0" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-bold text-slate-500">支払回数</span>
                  <select className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                    {LOAN_TERMS.map((t) => <option key={t} value={t}>{t}回</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-bold text-slate-500">年率（%）<span className="font-normal text-slate-400">最低{LOAN_APR_FROM}</span></span>
                  <input type="number" inputMode="decimal" min={LOAN_APR_FROM} step={0.1} className="input" value={apr}
                    onChange={(e) => setApr(Number(e.target.value))}
                    onBlur={(e) => setApr(Math.max(LOAN_APR_FROM, Number(e.target.value) || LOAN_APR_FROM))} />
                </label>
              </div>
            </div>
            <div className="bg-navy-700 p-3 text-white">
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
          </div>
          <p className="mt-1 text-[10px] text-slate-400">※ 年率は目安（提携ローン {LOAN_APR_FROM}%〜）。実際の金利・回数は審査で決定します。</p>
        </>
      )}

      {/* 内訳（総額） */}
      <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">車両価格</dt><dd className="font-bold">{formatYen(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">エスクロー・取引手数料</dt><dd>{formatYen(quote.escrow)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">名義変更代行{isKei ? '（軽）' : '（普通車）'}</dt><dd>{formatYen(transferPrice)}</dd></div>
        {garageProof && <div className="flex justify-between"><dt className="text-slate-500">車庫証明取得代行</dt><dd>{formatYen(garageFee)}</dd></div>}
        {warrantyFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">{warrantyLabel || '保証'}</dt><dd>{formatYen(warrantyFee)}</dd></div>}
        {delivery && transportFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">陸送でお届け</dt><dd>{formatYen(transportFee)}</dd></div>}
        {useLoan && quote.loanFee > 0 && <div className="flex justify-between"><dt className="text-slate-500">ローン事務手数料</dt><dd>{formatYen(quote.loanFee)}</dd></div>}
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-2">
          <dt className="font-black text-navy-800">{useLoan ? '諸費用込み総額' : 'お支払い総額（現金）'}</dt>
          <dd className="font-black text-navy-800">{formatYen(quote.grandTotal)}</dd>
        </div>
      </dl>

      {/* おトク比較（手続き代行：名義変更＋車庫証明） */}
      {savings > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
            <PiggyBank className="h-4 w-4" /> 手続き代行の おトク比較
          </div>
          <dl className="mt-2 space-y-0.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">市場相場（同種サービス大手）</dt><dd className="text-slate-400 line-through tabular-nums">{formatYen(marketProc)}</dd></div>
            <div className="flex justify-between"><dt className="font-bold text-slate-700">BUYMO</dt><dd className="font-bold tabular-nums">{formatYen(buymoProc)}</dd></div>
          </dl>
          <div className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-center text-white">
            <span className="text-sm font-bold">約 </span>
            <span className="text-xl font-black tabular-nums">{formatYen(savings)}</span>
            <span className="text-sm font-bold"> おトク</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">※ 名義変更{garageProof ? '＋車庫証明' : ''}代行の比較。市場相場は個人間売買サービス大手の公表料金より（当社調べ・2026年時点）。実際の費用は車両・地域により異なります。</p>
        </div>
      )}

      {/* STEP4 ローン審査（最後） */}
      {useLoan && (
        <>
          <div className="mt-4"><StepLabel n={4} text="ローン審査にすすむ" /></div>
          <Link href={loanHref} className="btn-accent w-full justify-center py-3 text-sm">
            この内容でローン仮審査にすすむ <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-1 text-center text-[11px] text-slate-400">仮審査は無料・最短で結果をご案内します。</p>
        </>
      )}

      <p className="mt-3 text-[11px] text-slate-400">
        ※ エスクローと名義変更代行は安全のため必ず含まれます。保証は料金表（税込）で自動計算。金額は目安です。
      </p>
    </div>
  );
}

/** ステップ番号つきの小見出し。 */
function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-navy-500 text-[10px] font-black text-white">{n}</span>
      <span className="text-[11px] font-black text-navy-700">{text}</span>
    </div>
  );
}
