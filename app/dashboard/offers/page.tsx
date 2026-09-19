import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Tag, CheckCircle2, XCircle, RefreshCw, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { sellerAcceptOffer, sellerRejectOffer, sellerCounterOffer, buyerAcceptCounter, buyerCancelOffer } from './actions';
import type { Offer } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending:   { label: '審査待ち',   className: 'bg-amber-100 text-amber-700' },
  countered: { label: '反対提示中', className: 'bg-navy-100 text-navy-700' },
  accepted:  { label: '成立',       className: 'bg-emerald-100 text-emerald-700' },
  rejected:  { label: '拒否',       className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'キャンセル', className: 'bg-slate-100 text-slate-500' },
  expired:   { label: '期限切れ',   className: 'bg-slate-100 text-slate-500' },
};

type OfferRow = Offer & {
  listings?: { id: string; title: string; maker: string; model: string; price: number } | null;
  buyer?:  { display_name: string } | null;
  seller?: { display_name: string } | null;
};

export default async function OffersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/offers');

  const { data: rows } = await supabase
    .from('offers')
    .select('*, listings(id, title, maker, model, price), buyer:profiles!offers_buyer_id_fkey(display_name), seller:profiles!offers_seller_id_fkey(display_name)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const offers = (rows ?? []) as unknown as OfferRow[];
  const received = offers.filter((o) => o.seller_id === user.id);
  const sent     = offers.filter((o) => o.buyer_id  === user.id);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-black">オファー管理</h1>

      {/* 受け取ったオファー（売主として） */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
          <Tag className="h-5 w-5 text-navy-500" /> 受け取ったオファー（{received.length}件）
        </h2>
        {received.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">受け取ったオファーはありません。</div>
        ) : (
          <ul className="space-y-4">
            {received.map((o) => {
              const info = STATUS_LABEL[o.status] ?? STATUS_LABEL.expired;
              return (
                <li key={o.id} className="card space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/listings/${o.listings?.id}`} className="font-bold hover:underline">
                        {o.listings?.title ?? '—'}
                      </Link>
                      <p className="text-xs text-slate-400">
                        定価 {formatYen(o.listings?.price ?? 0)} ・ 買主：{o.buyer?.display_name ?? '—'} ・ {formatDate(o.created_at)}
                      </p>
                    </div>
                    <span className={`badge ${info.className}`}>{info.label}</span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-lg font-black text-navy-700">{formatYen(o.amount)}</p>
                    {o.message && <p className="mt-1 text-sm text-slate-600">「{o.message}」</p>}
                  </div>

                  {o.status === 'pending' && (
                    <div className="space-y-3">
                      {/* 承認 */}
                      <form action={async () => {
                        'use server';
                        const res = await sellerAcceptOffer(o.id);
                        if (!res.error && res.escrowId) redirect(`/escrow/${res.escrowId}`);
                      }}>
                        <button className="btn-accent w-full">
                          <CheckCircle2 className="h-4 w-4" /> このオファーを承認してエスクローへ
                        </button>
                      </form>

                      {/* 反対提示 */}
                      <form action={async (fd: FormData) => {
                        'use server';
                        const ca = Number(fd.get('counter_amount'));
                        const cm = String(fd.get('counter_message') ?? '');
                        await sellerCounterOffer(o.id, ca, cm);
                      }} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            name="counter_amount"
                            type="number"
                            min={1}
                            defaultValue={o.listings?.price}
                            className="input flex-1 text-sm"
                            placeholder="反対提示額（円）"
                          />
                          <button type="submit" className="btn-outline shrink-0 flex items-center gap-1 text-sm">
                            <RefreshCw className="h-3.5 w-3.5" /> 反対提示
                          </button>
                        </div>
                        <input
                          name="counter_message"
                          className="input text-sm"
                          placeholder="コメント（任意）"
                        />
                      </form>

                      {/* 拒否 */}
                      <form action={async () => {
                        'use server';
                        await sellerRejectOffer(o.id);
                      }}>
                        <button className="w-full text-center text-xs font-bold text-red-500 hover:underline">
                          <XCircle className="mr-1 inline h-3.5 w-3.5" /> 拒否する
                        </button>
                      </form>
                    </div>
                  )}

                  {o.status === 'accepted' && o.conversation_id && (
                    <Link href={`/messages/${o.conversation_id}`} className="btn-outline block text-center text-sm">
                      チャットを開く →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 送ったオファー（買主として） */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
          <Tag className="h-5 w-5 text-accent-600" /> 送ったオファー（{sent.length}件）
        </h2>
        {sent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">送ったオファーはありません。</div>
        ) : (
          <ul className="space-y-4">
            {sent.map((o) => {
              const info = STATUS_LABEL[o.status] ?? STATUS_LABEL.expired;
              return (
                <li key={o.id} className="card space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/listings/${o.listings?.id}`} className="font-bold hover:underline">
                        {o.listings?.title ?? '—'}
                      </Link>
                      <p className="text-xs text-slate-400">
                        売主：{o.seller?.display_name ?? '—'} ・ {formatDate(o.created_at)}
                      </p>
                    </div>
                    <span className={`badge ${info.className}`}>{info.label}</span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-base font-bold text-navy-700">提示額：{formatYen(o.amount)}</p>
                    {o.message && <p className="mt-0.5 text-sm text-slate-500">「{o.message}」</p>}
                  </div>

                  {/* 反対提示への対応 */}
                  {o.status === 'countered' && o.counter_amount && (
                    <div className="rounded-lg border border-navy-200 bg-navy-50 p-3 space-y-2">
                      <p className="text-sm font-bold text-navy-700">
                        売主からの提示：{formatYen(o.counter_amount)}
                      </p>
                      {o.counter_message && (
                        <p className="text-sm text-navy-600">「{o.counter_message}」</p>
                      )}
                      <div className="flex gap-2">
                        <form action={async () => {
                          'use server';
                          const res = await buyerAcceptCounter(o.id);
                          if (!res.error && res.escrowId) redirect(`/escrow/${res.escrowId}`);
                        }} className="flex-1">
                          <button className="btn-accent w-full text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 承諾してエスクローへ
                          </button>
                        </form>
                        <form action={async () => {
                          'use server';
                          await buyerCancelOffer(o.id);
                        }}>
                          <button className="btn-outline text-sm text-red-500 hover:bg-red-50">断る</button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* 保留中はキャンセル可 */}
                  {o.status === 'pending' && (
                    <form action={async () => {
                      'use server';
                      await buyerCancelOffer(o.id);
                    }}>
                      <button className="text-xs font-bold text-slate-400 hover:text-red-500 hover:underline">
                        <Clock className="mr-0.5 inline h-3 w-3" /> オファーを取り消す
                      </button>
                    </form>
                  )}

                  {o.status === 'accepted' && o.conversation_id && (
                    <Link href={`/messages/${o.conversation_id}`} className="btn-outline block text-center text-sm">
                      チャット・エスクローを開く →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
