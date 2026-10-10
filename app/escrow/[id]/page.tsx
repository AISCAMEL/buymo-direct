import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageSquare, XCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EscrowStepper } from '@/components/EscrowStepper';
import { ReviewForm } from '@/components/ReviewForm';
import { PaymentPanel } from '@/components/PaymentPanel';
import { advanceEscrow, cancelEscrow, setTitleOption, setInstallment } from '@/app/escrow/actions';
import { TITLE_OPTIONS, PAYMENT_METHODS, INSTALLMENT_FEE } from '@/lib/constants';
import { isSquareConfigured } from '@/lib/square';
import { formatYen } from '@/lib/format';
import { EscrowPayButton } from '@/components/EscrowPayButton';
import { ExportButton } from '@/components/ExportButton';
import { ESCROW_NEXT_ACTION as NEXT_ACTION } from '@/lib/escrow';
import type { EscrowStatus, TitleTransferOption, PaymentMethod } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function EscrowPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/escrow/${id}`);

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('*, listings(id, title, maker, model), conversation_id, buyer:profiles!escrow_transactions_buyer_id_fkey(id, display_name), seller:profiles!escrow_transactions_seller_id_fkey(id, display_name)')
    .eq('id', id)
    .maybeSingle();
  if (!tx) notFound();
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) notFound();

  const listing = (tx as any).listings;
  const isBuyer = tx.buyer_id === user.id;
  const counterparty = isBuyer ? (tx as any).seller : (tx as any).buyer;

  // 自分がこの取引で相手を評価済みか
  const { data: myReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('escrow_id', id)
    .eq('reviewer_id', user.id)
    .maybeSingle();
  const role: 'buyer' | 'seller' = isBuyer ? 'buyer' : 'seller';
  const status = tx.status as EscrowStatus;
  const couponDiscount = (tx as any).coupon_discount ?? 0;
  const loanFeeAmt = (tx as any).loan_fee ?? 0;
  const total = tx.amount + tx.escrow_fee + tx.title_fee + tx.installment_fee + loanFeeAmt - couponDiscount;
  // 売り手の受取内訳：車両代金からエスクロー手数料（売り手負担）を控除
  const sellerFeeAmt = (tx as any).seller_fee ?? 0;
  const sellerPayout = Math.max(0, tx.amount - sellerFeeAmt);
  const paymentMethod = tx.payment_method as PaymentMethod | null;

  // 2回分割払いの状態と、次に支払う回の金額
  const installmentCount = (tx as any).installment_count ?? 1;
  const paid1 = (tx as any).installment_1_paid ?? false;
  const paid2 = (tx as any).installment_2_paid ?? false;
  const installmentLocked = paid1 || paid2; // 一部入金後は回数変更不可
  const half1 = Math.ceil(total / 2);
  const half2 = total - half1;
  let nextCharge = total;
  let payStage = '';
  if (installmentCount === 2) {
    if (!paid1) { nextCharge = half1; payStage = '2回のうち 1回目'; }
    else if (!paid2) { nextCharge = half2; payStage = '2回のうち 2回目'; }
    else { nextCharge = 0; }
  }

  const next = NEXT_ACTION[status];
  const canAct = next && (next.by === 'both' || next.by === role);
  // initiated の入金は PaymentPanel が担うため、汎用 advance ボタンは出さない
  const showAdvance = canAct && status !== 'initiated';
  const showWaiting = !!next && !showAdvance && !(status === 'initiated' && isBuyer);
  const canCancel = status === 'initiated' || status === 'funds_held';
  const isTerminal = status === 'completed' || status === 'cancelled' || status === 'disputed';

  const advanceBound = advanceEscrow.bind(null, id);
  const cancelBound = cancelEscrow.bind(null, id);

  // Square 設定（クライアントのカードフォーム用）
  const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const squareConfigured = isSquareConfigured() && !!squareAppId && !!squareLocationId;
  const squareSandbox = process.env.SQUARE_ENVIRONMENT !== 'production';

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-black">エスクロー取引</h1>
        <p className="text-sm text-slate-500">
          {listing?.maker} {listing?.model}「{listing?.title}」 ・ あなたは
          <span className="font-bold text-navy-600">{isBuyer ? '買主' : '売主'}</span>です
        </p>
      </div>

      {/* ステータス */}
      <div className="card p-6">
        {status === 'cancelled' ? (
          <p className="text-center font-bold text-slate-500">この取引はキャンセルされました。</p>
        ) : status === 'disputed' ? (
          <p className="text-center font-bold text-red-500">この取引は係争中です。サポートにお問い合わせください。</p>
        ) : (
          <EscrowStepper status={status} />
        )}
      </div>

      {/* 金額内訳 */}
      <div className="card p-6">
        <h2 className="mb-3 font-bold">お支払い内訳</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">車両代金</dt><dd className="font-bold">{formatYen(tx.amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">エスクロー手数料</dt><dd className="font-bold">{formatYen(tx.escrow_fee)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-slate-500">名義変更（{TITLE_OPTIONS[tx.title_option as TitleTransferOption].label}）</dt>
            <dd className="font-bold">{tx.title_fee === 0 ? '—' : formatYen(tx.title_fee)}</dd>
          </div>
          {tx.installment_fee > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">クレジット分割手数料（4.2%）</dt>
              <dd className="font-bold">{formatYen(tx.installment_fee)}</dd>
            </div>
          )}
          {loanFeeAmt > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">ローン手数料</dt>
              <dd className="font-bold">{formatYen(loanFeeAmt)}</dd>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <dt>クーポン割引</dt>
              <dd className="font-bold">−{formatYen(couponDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-bold">合計（買主負担）</dt><dd className="font-black text-navy-600">{formatYen(total)}</dd>
          </div>
          {paymentMethod && (
            <div className="flex justify-between pt-1 text-xs text-slate-400">
              <dt>お支払い方法</dt><dd>{PAYMENT_METHODS[paymentMethod].label}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* 売り手の受取内訳（当事者双方に表示：透明性のため） */}
      <div className="card p-6">
        <h2 className="mb-3 font-bold">売主の受取内訳</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">車両代金</dt><dd className="font-bold">{formatYen(tx.amount)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-slate-500">エスクロー手数料（売主負担）</dt>
            <dd className="font-bold">{sellerFeeAmt === 0 ? '—' : `−${formatYen(sellerFeeAmt)}`}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-bold">受取額（売主）</dt><dd className="font-black text-emerald-600">{formatYen(sellerPayout)}</dd>
          </div>
        </dl>
      </div>

      {/* 名義変更オプション（取引開始前・買主のみ変更可） */}
      {status === 'initiated' && isBuyer && (
        <div className="card p-6">
          <h2 className="mb-3 font-bold">名義変更オプション</h2>
          <div className="space-y-2">
            {(Object.keys(TITLE_OPTIONS) as TitleTransferOption[]).map((key) => {
              const opt = TITLE_OPTIONS[key];
              const selected = tx.title_option === key;
              const setBound = setTitleOption.bind(null, id, key);
              return (
                <form action={setBound} key={key}>
                  <button
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                      selected ? 'border-navy-400 bg-navy-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      <span className="font-bold">{opt.label}</span>
                      <span className="block text-xs text-slate-500">{opt.desc}</span>
                    </span>
                    <span className="shrink-0 font-bold">{opt.fee === 0 ? '無料' : formatYen(opt.fee)}</span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      )}

      {/* 入金（取引開始前・買主のみ）：支払い方法選択＋Square決済 */}
      {status === 'initiated' && isBuyer && (
        <PaymentPanel
          escrowId={id}
          currentMethod={paymentMethod}
          loanPrincipal={tx.amount + tx.escrow_fee + tx.title_fee}
          squareConfigured={squareConfigured}
          squareAppId={squareAppId}
          squareLocationId={squareLocationId}
          squareSandbox={squareSandbox}
        />
      )}

      {/* 支払い回数（カードの1回あたり上限が不安な場合に2回へ分割） */}
      {status === 'initiated' && isBuyer && (
        <div className="card p-6">
          <h2 className="mb-1 font-bold">お支払い回数</h2>
          <p className="mb-3 text-sm text-slate-500">
            カードの1回あたりの上限などで一括決済ができない場合、2回に分けてお支払いいただけます（分割時は手数料 {formatYen(INSTALLMENT_FEE)} を上乗せ）。
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as const).map((n) => {
              const selected = installmentCount === n;
              const bound = setInstallment.bind(null, id, n);
              return (
                <form action={bound} key={n}>
                  <button
                    disabled={installmentLocked}
                    className={`w-full rounded-lg border p-3 text-center transition disabled:opacity-60 ${
                      selected ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm font-bold">{n === 1 ? '1回で支払う' : '2回に分けて支払う'}</span>
                    <span className="block text-xs text-slate-500">
                      {n === 1 ? '一括' : `手数料 +${formatYen(INSTALLMENT_FEE)}`}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
          {installmentCount === 2 && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="flex justify-between"><span>1回目</span><span className={`font-bold ${paid1 ? 'text-emerald-600' : ''}`}>{formatYen(half1)}{paid1 ? '（入金済み）' : ''}</span></p>
              <p className="mt-1 flex justify-between"><span>2回目</span><span className={`font-bold ${paid2 ? 'text-emerald-600' : ''}`}>{formatYen(half2)}{paid2 ? '（入金済み）' : ''}</span></p>
              {installmentLocked && <p className="mt-2 text-slate-400">※ 入金開始後は回数を変更できません。</p>}
            </div>
          )}
        </div>
      )}

      {/* Square Checkout Link による支払い（ホスト型決済ページへリダイレクト） */}
      {status === 'initiated' && isBuyer && nextCharge > 0 && (
        <div className="card p-6">
          <h2 className="mb-2 font-bold">Squareの決済ページで支払う</h2>
          <p className="mb-4 text-sm text-slate-500">
            Square がホストする安全な決済ページにリダイレクトして、カード情報を入力いただけます。
            {payStage && <span className="ml-1 font-bold text-navy-600">（{payStage}）</span>}
          </p>
          <EscrowPayButton escrowId={id} amount={nextCharge} note={payStage || undefined} />
        </div>
      )}

      {/* アクション */}
      {!isTerminal && (
        <div className="card space-y-3 p-6">
          {(showAdvance || showWaiting) && next && (
            <p className="text-sm text-slate-500">{next.hint}</p>
          )}
          {showAdvance ? (
            <form action={advanceBound}>
              <button className="btn-accent w-full py-3 text-base">{next!.label}</button>
            </form>
          ) : showWaiting ? (
            <p className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-500">
              相手（{next!.by === 'buyer' ? '買主' : '売主'}）の操作を待っています。
            </p>
          ) : null}

          <div className="flex gap-2">
            {tx.conversation_id && (
              <Link href={`/messages/${tx.conversation_id}`} className="btn-outline flex-1">
                <MessageSquare className="h-4 w-4" /> メッセージ
              </Link>
            )}
            {canCancel && (
              <form action={cancelBound} className="flex-1">
                <button className="btn-outline w-full text-red-600">
                  <XCircle className="h-4 w-4" /> 取引をキャンセル
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {status === 'completed' && (
        <>
          <div className="card flex items-center gap-3 bg-emerald-50 p-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div className="flex-1">
              <p className="font-bold text-emerald-700">取引が完了しました！</p>
              <p className="text-sm text-emerald-600">売主への送金と名義変更が完了しています。ありがとうございました。</p>
            </div>
            <ExportButton href={`/api/export/invoice/${id}`} label="領収書を表示" newTab />
          </div>

          {myReview ? (
            <div className="card p-6 text-center text-sm text-slate-500">
              {counterparty?.display_name ?? '相手'} さんへの評価を投稿済みです。ありがとうございました。
            </div>
          ) : counterparty ? (
            <ReviewForm
              escrowId={id}
              revieweeId={counterparty.id}
              revieweeName={counterparty.display_name ?? '取引相手'}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
