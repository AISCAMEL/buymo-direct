import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Gauge, Calendar, Eye, Flame, TrendingDown } from 'lucide-react';
import { formatYen, formatMileage } from '@/lib/format';
import { FavoriteButton } from '@/components/FavoriteButton';
import { CompareButton } from '@/components/CompareButton';
import { LOAN_APR_FROM } from '@/lib/constants';
import { monthlyPayment } from '@/lib/loan';
import { sellerKind, SELLER_KIND_LABEL, SELLER_KIND_CLS } from '@/lib/listing-kind';
import type { ListingWithImages } from '@/lib/types';

const STATUS_BADGE: Record<string, string> = {
  active: '',
  reserved: 'bg-amber-100 text-amber-700',
  sold: 'bg-slate-200 text-slate-600',
};

export function ListingCard({
  listing,
  favorited = false,
  loggedIn = false,
  todayInquiries = 0,
  medianPrice,
  variant = 'grid',
}: {
  listing: ListingWithImages;
  favorited?: boolean;
  loggedIn?: boolean;
  todayInquiries?: number;
  /** 現在の検索条件の中央値（相場バッジ用）。 */
  medianPrice?: number;
  variant?: 'grid' | 'list';
}) {
  const cover = listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
  const kind = sellerKind(listing);
  const views = listing.view_count ?? 0;
  const boosted = !!listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const hot = boosted || views >= 50;
  // 相場より安い：中央値の10%以上安い現役出品
  const goodDeal =
    listing.status === 'active' &&
    !!medianPrice &&
    medianPrice > 0 &&
    listing.price > 0 &&
    listing.price <= medianPrice * 0.9;

  const cover_el = cover ? (
    <Image
      src={cover}
      alt={listing.title}
      fill
      className="object-cover transition group-hover:scale-105"
      sizes={variant === 'list' ? '(max-width: 640px) 40vw, 200px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    />
  ) : (
    <div className="flex h-full items-center justify-center text-slate-300">No Image</div>
  );

  const sellerBadge = (
    <span className={`badge absolute left-2 top-2 shadow-sm ${SELLER_KIND_CLS[kind]}`}>
      {SELLER_KIND_LABEL[kind]}
    </span>
  );

  const hotBadge =
    listing.status === 'active' && todayInquiries > 0 ? (
      <span className="badge absolute left-2 top-9 inline-flex items-center gap-1 bg-rose-500 text-white shadow-sm">
        <Flame className="h-3 w-3" />本日お問い合わせ{todayInquiries > 1 ? ` ${todayInquiries}` : ''}
      </span>
    ) : hot && listing.status === 'active' ? (
      <span className="badge absolute left-2 top-9 inline-flex items-center gap-1 bg-rose-100 text-rose-700 shadow-sm">
        <Flame className="h-3 w-3" />{boosted ? '注目' : '人気'}
      </span>
    ) : null;

  const overlays = (
    <>
      {sellerBadge}
      {hotBadge}
      {goodDeal && (
        <span className="badge absolute right-2 top-2 inline-flex items-center gap-1 bg-teal-600 text-white shadow-sm">
          <TrendingDown className="h-3 w-3" />相場より安い
        </span>
      )}
      {listing.repair_history && (
        <span className="badge absolute bottom-2 left-2 bg-red-100 text-red-700">修復歴あり</span>
      )}
      {listing.status !== 'active' && STATUS_BADGE[listing.status] && (
        <span className={`badge absolute bottom-2 right-2 ${STATUS_BADGE[listing.status]}`}>
          {listing.status === 'reserved' ? '商談中' : 'SOLD'}
        </span>
      )}
    </>
  );

  const specs = (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{listing.year}年</span>
      <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />{formatMileage(listing.mileage_km)}</span>
      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{listing.prefecture}</span>
      {views > 0 && <span className="inline-flex items-center gap-1 text-slate-400"><Eye className="h-3.5 w-3.5" />{views.toLocaleString()}</span>}
    </div>
  );

  if (variant === 'list') {
    return (
      <Link href={`/listings/${listing.id}`} className="card group relative flex gap-3 overflow-hidden p-3 transition hover:shadow-md">
        <FavoriteButton listingId={listing.id} initialFavorited={favorited} loggedIn={loggedIn} />
        <div className="relative aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-48">
          {cover_el}
          {overlays}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-navy-400">{listing.maker} {listing.model}</p>
          <h3 className="mt-0.5 line-clamp-2 font-bold">{listing.title}</h3>
          <p className="mt-1 text-xl font-black text-navy-600">{formatYen(listing.price)}</p>
          <p className="text-[11px] font-bold text-slate-500">
            ローン月々 {formatYen(monthlyPayment(listing.price, LOAN_APR_FROM, 60))}〜
          </p>
          {specs}
          <div className="mt-2"><CompareButton listingId={listing.id} /></div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/listings/${listing.id}`} className="card group relative overflow-hidden transition hover:shadow-md">
      <FavoriteButton listingId={listing.id} initialFavorited={favorited} loggedIn={loggedIn} />
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {cover_el}
        {overlays}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold text-navy-400">
          {listing.maker} {listing.model}
        </p>
        <h3 className="mt-0.5 line-clamp-1 font-bold">{listing.title}</h3>
        <p className="mt-2 text-xl font-black text-navy-600">{formatYen(listing.price)}</p>
        <p className="text-[11px] font-bold text-slate-500">
          ローン月々 {formatYen(monthlyPayment(listing.price, LOAN_APR_FROM, 60))}〜
        </p>
        {specs}
        <div className="mt-2">
          <CompareButton listingId={listing.id} />
        </div>
      </div>
    </Link>
  );
}
