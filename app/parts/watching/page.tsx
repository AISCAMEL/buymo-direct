import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Heart, Clock, Tag, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import {
  PART_CATEGORY_LABEL, CONDITION_LABEL, AUCTION_STATUS_LABEL, AUCTION_STATUS_CLS,
  timeLeftLabel, type PartAuction, type AuctionStatus,
} from '@/lib/part-auction';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ウォッチ中のパーツ | BUYMO ダイレクト' };

export default async function WatchingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/parts/watching');

  const { data: watches } = await supabase
    .from('part_watches')
    .select('auction_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const ids = (watches ?? []).map((w: { auction_id: string }) => w.auction_id);
  let rows: PartAuction[] = [];
  if (ids.length > 0) {
    const { data } = await supabase.from('part_auctions').select('*').in('id', ids);
    rows = (data ?? []) as PartAuction[];
    // ウォッチ登録順に並べる
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0));
  }

  const fitLabel = (a: PartAuction) => [a.fit_maker, a.fit_model].filter(Boolean).join(' ');

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <Link href="/parts" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> パーツオークション一覧
      </Link>
      <div className="flex items-center gap-2">
        <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
        <h1 className="text-2xl font-black">ウォッチ中のパーツ</h1>
      </div>

      {rows.length === 0 ? (
        <p className="card p-12 text-center text-sm text-slate-500">
          ウォッチ中の出品はありません。気になる商品の「ウォッチ」ボタンから登録できます。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((a) => {
            const st = a.status as AuctionStatus;
            const active = st === 'active' && new Date(a.ends_at).getTime() > Date.now();
            return (
              <Link key={a.id} href={`/parts/${a.id}`} className="card group overflow-hidden p-0 transition hover:shadow-md">
                <div className="relative aspect-square bg-slate-100">
                  {a.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.images[0]} alt={a.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300"><Tag className="h-10 w-10" /></div>
                  )}
                  <span className={`absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${AUCTION_STATUS_CLS[st]}`}>{AUCTION_STATUS_LABEL[st]}</span>
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {PART_CATEGORY_LABEL[a.category]} / {CONDITION_LABEL[a.item_condition]}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-navy-800">{a.title}</p>
                  {fitLabel(a) && (
                    <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-navy-500"><Car className="h-3 w-3 shrink-0" />{fitLabel(a)}</p>
                  )}
                  <div className="mt-1.5 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400">現在価格</p>
                      <p className="text-lg font-black text-accent-600 tabular-nums">{formatYen(a.current_price)}</p>
                    </div>
                    <p className="text-[10px] text-slate-400">入札 {a.bid_count}件</p>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                    <Clock className="h-3 w-3" /> {active ? timeLeftLabel(a.ends_at) : '終了'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
