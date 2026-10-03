import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { getPricingConfig } from '@/lib/settings';
import { formatYen } from '@/lib/format';
import { createAuctionListing } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'オークションに出品 | 加盟店' };

export default async function NewAuctionPage() {
  await requireDealer();
  const cfg = await getPricingConfig();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/dealer/auctions" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> オークションへ
      </Link>
      <h1 className="text-2xl font-black">オークションに出品</h1>
      <p className="rounded-xl border border-gold-200 bg-gold-50/60 p-3 text-sm text-gold-800">
        出品料 <b>{formatYen(cfg.auctionListingFee)}</b>／台（出品時に発生）。
      </p>

      <form action={createAuctionListing} className="card space-y-4 p-6">
        <div><label className="label">車名 *</label><input name="car_name" required className="input" placeholder="例）プリウス S 2019年式" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">メーカー</label><input name="maker" className="input" placeholder="トヨタ" /></div>
          <div><label className="label">年式（西暦）</label><input name="model_year" type="number" className="input" placeholder="2019" /></div>
          <div><label className="label">走行距離（km）</label><input name="mileage" type="number" className="input" placeholder="45000" /></div>
          <div><label className="label">希望落札価格（円）</label><input name="reserve_price" type="number" className="input" placeholder="1200000" /></div>
        </div>
        <button type="submit" className="btn-accent w-full">この内容で出品する</button>
      </form>
    </div>
  );
}
