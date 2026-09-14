'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard, Banknote, Landmark } from 'lucide-react';
import { setPaymentMethod, confirmEscrowPayment } from '@/app/escrow/actions';
import { PAYMENT_METHODS, LOAN_APR_FROM } from '@/lib/constants';
import { LoanSimulator } from '@/components/LoanSimulator';
import { CouponInput } from '@/components/CouponInput';
import { cn } from '@/lib/format';
import type { PaymentMethod } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Square?: any;
  }
}

const ICONS: Record<PaymentMethod, typeof CreditCard> = {
  cash: Banknote,
  loan: Landmark,
  credit: CreditCard,
};

export function PaymentPanel({
  escrowId,
  currentMethod,
  loanPrincipal,
  squareConfigured,
  squareAppId,
  squareLocationId,
  squareSandbox,
}: {
  escrowId: string;
  currentMethod: PaymentMethod | null;
  loanPrincipal: number;
  squareConfigured: boolean;
  squareAppId?: string;
  squareLocationId?: string;
  squareSandbox: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const cardRef = useRef<any>(null);
  const [cardReady, setCardReady] = useState(false);
  const useSquareCard = currentMethod === 'credit' && squareConfigured && !!squareAppId;

  async function chooseMethod(method: PaymentMethod) {
    if (method === currentMethod) return;
    setBusy(true);
    await setPaymentMethod(escrowId, method);
    setBusy(false);
    router.refresh();
  }

  // Square Web Payments SDK の読み込み & カードフォーム生成
  useEffect(() => {
    if (!useSquareCard) return;
    let cancelled = false;

    async function init() {
      const src = squareSandbox
        ? 'https://sandbox.web.squarecdn.com/v1/square.js'
        : 'https://web.squarecdn.com/v1/square.js';
      if (!window.Square) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Square SDK の読み込みに失敗しました'));
          document.head.appendChild(s);
        });
      }
      if (cancelled || !window.Square) return;
      try {
        const payments = window.Square.payments(squareAppId, squareLocationId);
        const card = await payments.card();
        await card.attach('#square-card-container');
        cardRef.current = card;
        if (!cancelled) setCardReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'カードフォームの初期化に失敗しました');
      }
    }
    init();
    return () => {
      cancelled = true;
      if (cardRef.current?.destroy) cardRef.current.destroy();
      cardRef.current = null;
      setCardReady(false);
    };
  }, [useSquareCard, squareAppId, squareLocationId, squareSandbox]);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      let sourceId: string | undefined;
      if (useSquareCard) {
        if (!cardRef.current) throw new Error('カードフォームが未準備です');
        const result = await cardRef.current.tokenize();
        if (result.status !== 'OK') {
          throw new Error(result.errors?.[0]?.message ?? 'カード情報を確認してください');
        }
        sourceId = result.token;
      }
      const res = await confirmEscrowPayment(escrowId, sourceId, couponId, couponDiscount);
      if (res.error) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '入金に失敗しました');
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-bold">お支払い方法</h2>

      {/* クーポン */}
      <div>
        <p className="mb-1.5 text-sm font-bold text-slate-700">クーポンコード</p>
        <CouponInput
          totalAmount={loanPrincipal}
          onApply={(disc, cid) => { setCouponDiscount(disc); setCouponId(cid); }}
        />
      </div>

      <div className="space-y-2">
        {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => {
          const m = PAYMENT_METHODS[key];
          const Icon = ICONS[key];
          const selected = currentMethod === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => chooseMethod(key)}
              disabled={busy}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition',
                selected ? 'border-navy-400 bg-navy-50' : 'border-slate-200 hover:bg-slate-50'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', selected ? 'text-navy-500' : 'text-slate-400')} />
              <span>
                <span className="font-bold">{m.label}</span>
                <span className="block text-xs text-slate-500">{m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ローン：年率の開示＋返済シミュレーション */}
      {currentMethod === 'loan' && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            ※ 提携ローンの年率は <span className="font-bold">{LOAN_APR_FROM}%〜</span>（審査により決定）。
            分割金利は提携ローン会社との契約となり、エスクロー合計（現金価格）には含まれません。
            「入金を確定する」でローン利用の意思表示として記録します。
          </p>
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 text-sm font-bold text-slate-700">返済シミュレーション</p>
            <LoanSimulator principal={loanPrincipal} aprFrom={LOAN_APR_FROM} />
            <Link href="/loan/apply" className="mt-2 inline-block text-xs font-bold text-accent-600 hover:underline">
              提携ローンの仮審査を申し込む →
            </Link>
          </div>
        </div>
      )}

      {/* クレジット：Square カードフォーム or デモ */}
      {currentMethod === 'credit' && (
        <div className="rounded-lg bg-slate-50 p-3">
          {useSquareCard ? (
            <>
              <div id="square-card-container" />
              {!cardReady && (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> カードフォームを読み込み中…
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-amber-700">
              ※ Square 未設定のためデモモードです（実際の課金は行われません）。
              本番では環境変数 <code>SQUARE_ACCESS_TOKEN</code> 等を設定してください。
            </p>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {currentMethod && (
        <button onClick={pay} disabled={busy || (useSquareCard && !cardReady)} className="btn-accent w-full py-3 text-base">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {currentMethod === 'credit'
            ? useSquareCard ? 'カードで支払う' : 'デモで入金を確定'
            : '入金を確定する'}
        </button>
      )}
    </div>
  );
}
