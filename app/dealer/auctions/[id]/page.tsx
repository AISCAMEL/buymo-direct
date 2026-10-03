import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Gavel, Calculator } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { createClient } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/settings';
import { formatYen, formatMileage } from '@/lib/format';
import { AUCTION_STATUS_LABEL, AUCTION_STATUS_CLS } from '@/lib/auction';
import { setAuctionStatus, saveSettlement } from '../actions';

export const dynamic = 'force-dynamic';

type Listing = {
  id: string; dealer_id: string; car_name: string; maker: string | null; model_year: number | null;
  mileage: number | null; reserve_price: number | null; listing_fee: number; status: string;
};
type Settlement = {
  sale_price: number; purchase_cost: number; expenses: number; listing_fee: number;
  profit: number; commission_rate: number; commission: number; total_due: number;
};

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dealer } = await requireDealer();
  const supabase = await createClient();
  const cfg = await getPricingConfig();

  const { data: listingRow } = await supabase.from('auction_listings').select('*').eq('id', id).maybeSingle();
  const listing = listingRow as Listing | null;
  if (!listing || listing.dealer_id !== dealer.dealerId) notFound();

  const { data: stRow } = await supabase.from('auction_settlements').select('*').eq('listing_id', id).maybeSingle();
  const st = stRow as Settlement | null;

  const Row = ({ label, value, strong = false, sub = false }: { label: string; value: string; strong?: boolean; sub?: boolean }) => (
    <div className={`flex justify-between py-1.5 ${strong ? 'border-t border-slate-200 pt-2.5 text-base' : 'text-sm'}`}>
      <span className={sub ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-black text-navy-700' : 'font-bold'}`}>{value}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/dealer/auctions" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> オークションへ
      </Link>

      <div className="card p-5">
        <p className="flex flex-wrap items-center gap-2 text-xl font-black">
          <Gavel className="h-5 w-5 text-navy-500" />
          <span className={`badge ${AUCTION_STATUS_CLS[listing.status] ?? 'bg-slate-100 text-slate-600'}`}>{AUCTION_STATUS_LABEL[listing.status] ?? listing.status}</span>
          {listing.car_name}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {[listing.maker, listing.model_year ? `${listing.model_year}年` : null, listing.mileage ? formatMileage(listing.mileage) : null].filter(Boolean).join('・')}
          {listing.reserve_price ? `　希望落札 ${formatYen(listing.reserve_price)}` : ''}
        </p>
        <p className="mt-1 text-xs text-slate-400">出品料 {formatYen(listing.listing_fee)}</p>

        {listing.status === 'listed' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={setAuctionStatus.bind(null, listing.id, 'sold')}>
              <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">落札（売れた）</button>
            </form>
            <form action={setAuctionStatus.bind(null, listing.id, 'unsold')}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">不落</button>
            </form>
            <form action={setAuctionStatus.bind(null, listing.id, 'cancelled')}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">取消</button>
            </form>
          </div>
        )}
      </div>

      {/* 決算書 */}
      {st && listing.status === 'settled' ? (
        <div className="card p-6">
          <p className="flex items-center gap-2 font-black text-slate-700"><Calculator className="h-5 w-5 text-navy-500" />決算書</p>
          <div className="mt-3">
            <Row label="落札額" value={formatYen(st.sale_price)} />
            <Row label="仕入れ原価" value={`− ${formatYen(st.purchase_cost)}`} />
            <Row label="諸経費" value={`− ${formatYen(st.expenses)}`} />
            <Row label="利益" value={formatYen(st.profit)} strong />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <Row label="出品料" value={formatYen(st.listing_fee)} />
            <Row label={`成約手数料（利益の ${(st.commission_rate * 100).toFixed(0)}%）`} value={formatYen(st.commission)} />
            <Row label="本部へのお支払い" value={formatYen(st.total_due)} strong />
          </div>
          {st.profit <= 0 && <p className="mt-2 text-xs text-slate-400">※ 利益が出ていないため成約手数料は発生しません（出品料のみ）。</p>}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-bold text-navy-600">決算書を修正する</summary>
            <SettlementForm id={listing.id} listingFee={listing.listing_fee} prefill={st} />
          </details>
        </div>
      ) : (
        <div className="card p-6">
          <p className="flex items-center gap-2 font-black text-slate-700"><Calculator className="h-5 w-5 text-navy-500" />決算書を入力</p>
          <p className="mt-1 text-sm text-slate-500">落札額・仕入れ原価・諸経費を入力すると、利益と成約手数料（利益の {(cfg.dealCommissionRate * 100).toFixed(0)}%）を自動計算します。</p>
          <SettlementForm id={listing.id} listingFee={listing.listing_fee} prefill={st} />
        </div>
      )}
    </div>
  );
}

function SettlementForm({ id, listingFee, prefill }: { id: string; listingFee: number; prefill: Settlement | null }) {
  return (
    <form action={saveSettlement.bind(null, id)} className="mt-4 space-y-3">
      <div><label className="label">落札額（円）*</label><input name="sale_price" type="number" required defaultValue={prefill?.sale_price || ''} className="input" placeholder="1200000" /></div>
      <div><label className="label">仕入れ原価（円）*</label><input name="purchase_cost" type="number" required defaultValue={prefill?.purchase_cost || ''} className="input" placeholder="900000" /></div>
      <div><label className="label">諸経費（陸送・整備など／円）</label><input name="expenses" type="number" defaultValue={prefill?.expenses || ''} className="input" placeholder="30000" /></div>
      <p className="text-xs text-slate-400">出品料 {formatYen(listingFee)} は自動で加算されます。</p>
      <button type="submit" className="btn-accent w-full">決算書を保存・手数料を算出</button>
    </form>
  );
}
