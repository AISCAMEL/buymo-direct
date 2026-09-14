import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageSquare, XCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EscrowStepper } from '@/components/EscrowStepper';
import { ReviewForm } from '@/components/ReviewForm';
import { PaymentPanel } from '@/components/PaymentPanel';
import { advanceEscrow, cancelEscrow, setTitleOption } from '@/app/escrow/actions';
import { TITLE_OPTIONS, PAYMENT_METHODS } from '@/lib/constants';
import { isSquareConfigured } from '@/lib/square';
import { formatYen } from '@/lib/format';
import { EscrowPayButton } from '@/components/EscrowPayButton';
import { ExportButton } from '@/components/ExportButton';
import type { EscrowStatus, TitleTransferOption, PaymentMethod } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

// 次に進めるアクションのラベル（実行者の役割つき）
const NEXT_ACTION: Partial<Record<EscrowStatus, { label: string; by: 'buyer' | 'seller' | 'both'; hint: string }>> = {
  initiated: { label: '代金をエスクローに入金する', by: 'buyer', hint: '買主が代金を入金すると第三者が保全します。' },
  funds_held: { label: '現車確認を完了する', by: 'both', hint: '受け渡し・現車確認が済んだら次へ進めます。' },
  inspection: { label: '名義変更を開始する', by: 'both', hint: '必要書類を揃え、名義変更手続きに進みます。' },
  title_transfer: { label: '取引を完了して送金する', by: 'buyer', hint: '名義変更完了を確認したら売主へ送金されます。' },
};

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
  const total = tx.amount + tx.escrow_fee + tx.title_fee + tx.installment_fee - couponDiscount;
  const paymentMethod = tx.payment_method as PaymentMethod | null;

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

      {/* Square Checkout Link による支払い（ホスト型決済ページへリダイレクト） */}
      {status === 'initiated' && isBuyer && (
        <div className="card p-6">
          <h2 className="mb-2 font-bold">Squareの決済ページで支払う</h2>
          <p className="mb-4 text-sm text-slate-500">
            Square がホストする安全な決済ページにリダイレクトして、カード情報を入力いただけます。
          </p>
          <EscrowPayButton escrowId={id} amount={total} />
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
