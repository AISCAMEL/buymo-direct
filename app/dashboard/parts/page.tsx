import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gavel, Plus, Tag, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import {
  PART_CATEGORY_LABEL,
  AUCTION_STATUS_LABEL,
  AUCTION_STATUS_CLS,
  timeLeftLabel,
  type PartAuction,
  type AuctionStatus,
} from '@/lib/part-auction';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'パーツ出品・入札 | BUYMO ダイレクト' };

function Card({ a, note }: { a: PartAuction; note?: string }) {
  const status = a.status as AuctionStatus;
  const active = status === 'active' && new Date(a.ends_at).getTime() > Date.now();
  return (
    <Link href={`/parts/${a.id}`} className="card flex items-center gap-3 p-3 transition hover:shadow-md">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {a.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><Tag className="h-6 w-6" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-navy-800">{a.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="badge bg-slate-100 text-slate-500">{PART_CATEGORY_LABEL[a.category]}</span>
          <span className={`badge ${AUCTION_STATUS_CLS[status]}`}>{AUCTION_STATUS_LABEL[status]}</span>
          {note && <span className="text-accent-600 font-bold">{note}</span>}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatYen(a.current_price)} ・ 入札{a.bid_count}件 ・ {active ? timeLeftLabel(a.ends_at) : '終了'}
        </p>
      </div>
    </Link>
  );
}

export default async function DashboardPartsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/parts');

  let selling: PartAuction[] = [];
  let bidding: PartAuction[] = [];
  let won: PartAuction[] = [];
  let tableMissing = false;

  try {
    const { data: mine, error } = await supabase
      .from('part_auctions')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) tableMissing = true;
    selling = (mine ?? []) as PartAuction[];

    // 自分が入札したオークション
    const { data: myBids } = await supabase
      .from('part_bids')
      .select('auction_id')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    const bidIds = [...new Set((myBids ?? []).map((b: { auction_id: string }) => b.auction_id))];
    if (bidIds.length > 0) {
      const { data: auctions } = await supabase
        .from('part_auctions')
        .select('*')
        .in('id', bidIds)
        .order('ends_at', { ascending: false })
        .limit(100);
      const list = (auctions ?? []) as PartAuction[];
      won = list.filter((a) => a.winner_id === user.id);
      bidding = list.filter((a) => a.winner_id !== user.id && a.status === 'active' && new Date(a.ends_at).getTime() > Date.now());
    }
  } catch {
    tableMissing = true;
  }

  const Section = ({ title, items, emptyNote, noteFn }: { title: string; items: PartAuction[]; emptyNote?: string; noteFn?: (a: PartAuction) => string | undefined }) => (
    <section className="space-y-2">
      <h2 className="text-sm font-black text-slate-500">{title}（{items.length}）</h2>
      {items.length === 0 ? (
        emptyNote ? <p className="card p-4 text-center text-xs text-slate-400">{emptyNote}</p> : null
      ) : (
        <div className="space-y-2">{items.map((a) => <Card key={a.id} a={a} note={noteFn?.(a)} />)}</div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black">パーツ出品・入札</h1>
        </div>
        <Link href="/parts/new" className="btn-accent text-sm"><Plus className="h-4 w-4" /> 出品する</Link>
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">part_auctions テーブルが未適用です。</p>
          <p className="mt-1">Supabase で <code>supabase/migrations/20240769_part_auctions.sql</code> を実行してください。</p>
        </div>
      )}

      {!tableMissing && selling.length === 0 && bidding.length === 0 && won.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">
          パーツの出品・入札はまだありません。「出品する」からオークションに出品できます。
        </p>
      ) : (
        <>
          <Section title="出品した商品" items={selling} emptyNote="出品はまだありません。" />
          <Section title="落札した商品" items={won} noteFn={() => '落札'} />
          <Section title="入札中" items={bidding} noteFn={(a) => (a.highest_bidder_id === user.id ? '最高入札中' : '入札あり')} />
        </>
      )}
    </div>
  );
}
