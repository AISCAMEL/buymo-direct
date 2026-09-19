import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Gauge, Calendar } from 'lucide-react';
import { formatYen, formatMileage } from '@/lib/format';
import { FavoriteButton } from '@/components/FavoriteButton';
import { CompareButton } from '@/components/CompareButton';
import { LOAN_APR_FROM } from '@/lib/constants';
import { monthlyPayment } from '@/lib/loan';
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
}: {
  listing: ListingWithImages;
  favorited?: boolean;
  loggedIn?: boolean;
}) {
  const cover = listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;

  return (
    <Link href={`/listings/${listing.id}`} className="card group relative overflow-hidden transition hover:shadow-md">
      <FavoriteButton listingId={listing.id} initialFavorited={favorited} loggedIn={loggedIn} />
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">No Image</div>
        )}
        <span className="badge absolute left-2 top-2 bg-gold-500 text-[#2E2408] shadow-sm">買取保証つき</span>
        {listing.repair_history && (
          <span className="badge absolute bottom-2 left-2 bg-red-100 text-red-700">修復歴あり</span>
        )}
        {listing.status !== 'active' && STATUS_BADGE[listing.status] && (
          <span className={`badge absolute bottom-2 right-2 ${STATUS_BADGE[listing.status]}`}>
            {listing.status === 'reserved' ? '商談中' : 'SOLD'}
          </span>
        )}
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
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{listing.year}年</span>
          <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />{formatMileage(listing.mileage_km)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{listing.prefecture}</span>
        </div>
        <div className="mt-2">
          <CompareButton listingId={listing.id} />
        </div>
      </div>
    </Link>
  );
}
