import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Gavel, Clock, Tag, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDateTime } from '@/lib/format';
import { placeBid, buyNow, cancelPartAuction, closePartAuctionIfEnded } from '../actions';
import {
  PART_CATEGORY_LABEL,
  CONDITION_LABEL,
  AUCTION_STATUS_LABEL,
  AUCTION_STATUS_CLS,
  minNextBid,
  timeLeftLabel,
  type PartAuction,
  type PartBid,
  type AuctionStatus,
} from '@/lib/part-auction';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function PartAuctionPage({ params }: { params: Params }) {
  const { id } = await params;
  // 終了時刻を過ぎていれば確定（ベストエフォート）
  await closePartAuctionIfEnded(id).catch(() => {});

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase.from('part_auctions').select('*').eq('id', id).maybeSingle();
  const a = data as PartAuction | null;
  if (!a) notFound();

  const { data: bidRows } = await supabase
    .from('part_bids')
    .select('id, bidder_id, amount, created_at')
    .eq('auction_id', id)
    .order('created_at', { ascending: false })
    .limit(20);
  const bids = (bidRows ?? []) as PartBid[];

  const ids = [...new Set([a.seller_id, a.winner_id, ...bids.map((b) => b.bidder_id)].filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    (profs ?? []).forEach((p: { id: string; display_name: string | null }) => nameMap.set(p.id, p.display_name ?? '利用者'));
  }
  const maskName = (uid: string | null) => {
    if (!uid) return '—';
    const n = nameMap.get(uid) ?? '利用者';
    return n.length <= 1 ? n : `${n.slice(0, 1)}***`;
  };

  const status = a.status as AuctionStatus;
  const isOwner = user?.id === a.seller_id;
  const isActive = status === 'active' && new Date(a.ends_at).getTime() > Date.now();
  const minBid = minNextBid(a.current_price, a.bid_count, a.start_price);

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-2">
      <Link href="/parts" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> パーツオークション一覧
      </Link>

      {/* 画像 */}
      <div className="grid gap-2">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-100">
          {a.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.images[0]} alt={a.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300"><Tag className="h-12 w-12" /></div>
          )}
        </div>
        {a.images && a.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {a.images.slice(1).map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>

      {/* 基本情報 */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-navy-50 text-navy-700">{PART_CATEGORY_LABEL[a.category]}</span>
          <span className="badge bg-slate-100 text-slate-600">{CONDITION_LABEL[a.item_condition]}</span>
          <span className={`badge ${AUCTION_STATUS_CLS[status]}`}>{AUCTION_STATUS_LABEL[status]}</span>
        </div>
        <h1 className="mt-2 text-xl font-black text-navy-800">{a.title}</h1>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-400">現在価格</p>
            <p className="text-3xl font-black text-accent-600 tabular-nums">{formatYen(a.current_price)}</p>
            <p className="mt-0.5 text-xs text-slate-400">入札 {a.bid_count}件 ・ 開始 {formatYen(a.start_price)}</p>
          </div>
          <div className="text-right">
            {isActive ? (
              <p className="flex items-center gap-1 font-bold text-amber-600"><Clock className="h-4 w-4" />{timeLeftLabel(a.ends_at)}</p>
            ) : (
              <p className="text-sm font-bold text-slate-400">{formatDateTime(a.ends_at)} 終了</p>
            )}
            {a.buy_now_price != null && isActive && (
              <p className="mt-1 text-xs text-slate-500">即決 {formatYen(a.buy_now_price)}</p>
            )}
          </div>
        </div>

        {a.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.description}</p>}
        <p className="mt-3 text-xs text-slate-400">出品者: {maskName(a.seller_id)}</p>
      </div>

      {/* 落札結果 */}
      {(status === 'sold' || status === 'ended') && (
        <div className="card p-5 text-center">
          {status === 'sold' ? (
            <>
              <p className="text-sm font-bold text-gold-700">落札されました</p>
              <p className="mt-1 text-2xl font-black text-gold-700">{formatYen(a.current_price)}</p>
              <p className="mt-1 text-xs text-slate-400">落札者: {maskName(a.winner_id)}</p>
              {(user?.id === a.winner_id || isOwner) && (
                <p className="mt-2 text-sm text-slate-600">取引・発送のやりとりは、落札者・出品者間で進めてください。</p>
              )}
            </>
          ) : (
            <p className="text-sm font-bold text-slate-500">入札がないまま終了しました。</p>
          )}
        </div>
      )}

      {/* 入札・即決 */}
      {isActive && !isOwner && (
        <div className="card space-y-3 p-5">
          <form action={placeBid} className="space-y-2">
            <input type="hidden" name="auction_id" value={a.id} />
            <label className="label">入札額（最低 {formatYen(minBid)}）</label>
            <div className="flex gap-2">
              <input
                type="number" name="amount" min={minBid} step={1} defaultValue={minBid} inputMode="numeric"
                className="input flex-1" required
              />
              <button className="btn-accent shrink-0"><Gavel className="h-4 w-4" /> 入札する</button>
            </div>
            <p className="text-xs text-slate-400">入札単位に応じて、現在価格を上回る額で入札してください。</p>
          </form>
          {a.buy_now_price != null && (
            <form action={buyNow}>
              <input type="hidden" name="auction_id" value={a.id} />
              <button className="btn-gold w-full">即決で購入する（{formatYen(a.buy_now_price)}）</button>
            </form>
          )}
          {!user && <p className="text-xs text-slate-400">入札にはログインが必要です。</p>}
        </div>
      )}

      {/* 出品者コントロール */}
      {isOwner && isActive && (
        <div className="card p-5">
          <p className="text-sm text-slate-500">これはあなたの出品です。</p>
          {a.bid_count === 0 ? (
            <form action={cancelPartAuction} className="mt-2">
              <input type="hidden" name="auction_id" value={a.id} />
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">出品を取り消す</button>
            </form>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600"><ShieldAlert className="h-3.5 w-3.5" /> 入札があるため取消できません。</p>
          )}
        </div>
      )}

      {/* 入札履歴 */}
      {bids.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-bold text-navy-800">入札履歴</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {bids.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">{maskName(b.bidder_id)}</span>
                <span className="font-bold tabular-nums">{formatYen(b.amount)}</span>
                <span className="text-xs text-slate-400">{formatDateTime(b.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
