import Link from 'next/link';
import { Gavel, Plus } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { createClient } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/settings';
import { formatYen, formatDate } from '@/lib/format';
import { AUCTION_STATUS_LABEL, AUCTION_STATUS_CLS } from '@/lib/auction';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'オークション出品 | 加盟店' };

type Row = { id: string; car_name: string; maker: string | null; model_year: number | null; status: string; listing_fee: number; created_at: string };

export default async function DealerAuctionsPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();
  const cfg = await getPricingConfig();

  const { data } = await supabase
    .from('auction_listings')
    .select('id, car_name, maker, model_year, status, listing_fee, created_at')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-black"><Gavel className="h-6 w-6 text-navy-500" />オークション出品</h1>
        <Link href="/dealer/auctions/new" className="btn-accent flex items-center gap-1 text-sm"><Plus className="h-4 w-4" />出品する</Link>
      </div>
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        出品料は1台 <b>{formatYen(cfg.auctionListingFee)}</b>。落札後に決算書を入力すると、成約手数料（利益の {(cfg.dealCommissionRate * 100).toFixed(0)}%）を自動算出します。
      </p>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">出品はまだありません。「出品する」から登録してください。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/dealer/auctions/${r.id}`} className="card flex items-center justify-between gap-3 p-4 hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold">
                    <span className={`badge ${AUCTION_STATUS_CLS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{AUCTION_STATUS_LABEL[r.status] ?? r.status}</span>
                    {r.car_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{[r.maker, r.model_year ? `${r.model_year}年` : null].filter(Boolean).join('・')}　出品 {formatDate(r.created_at)}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">出品料 {formatYen(r.listing_fee)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
