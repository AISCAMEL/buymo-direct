import { ListingCard } from '@/components/ListingCard';
import type { ListingWithImages } from '@/lib/types';

export function ListingGrid({
  listings,
  favoritedIds,
  loggedIn = false,
}: {
  listings: ListingWithImages[];
  favoritedIds?: Set<string>;
  loggedIn?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <ListingCard
          key={l.id}
          listing={l}
          favorited={favoritedIds?.has(l.id) ?? false}
          loggedIn={loggedIn}
        />
      ))}
    </div>
  );
}
