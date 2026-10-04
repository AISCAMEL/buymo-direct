import { ListingCard } from '@/components/ListingCard';
import { getTodayInquiryMap } from '@/lib/activity';
import type { ListingWithImages } from '@/lib/types';

export async function ListingGrid({
  listings,
  favoritedIds,
  loggedIn = false,
}: {
  listings: ListingWithImages[];
  favoritedIds?: Set<string>;
  loggedIn?: boolean;
}) {
  // 「本日お問い合わせ」を一覧ぶんまとめて集計（1クエリ）
  const inquiryMap = await getTodayInquiryMap(listings.map((l) => l.id));

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <ListingCard
          key={l.id}
          listing={l}
          favorited={favoritedIds?.has(l.id) ?? false}
          loggedIn={loggedIn}
          todayInquiries={inquiryMap[l.id] ?? 0}
        />
      ))}
    </div>
  );
}
