import { ListingCard } from '@/components/ListingCard';
import { getTodayInquiryMap } from '@/lib/activity';
import type { ListingWithImages } from '@/lib/types';

export async function ListingGrid({
  listings,
  favoritedIds,
  loggedIn = false,
  view = 'grid',
  medianPrice,
}: {
  listings: ListingWithImages[];
  favoritedIds?: Set<string>;
  loggedIn?: boolean;
  view?: 'grid' | 'list';
  /** 現在の検索条件の中央値（相場バッジ用）。 */
  medianPrice?: number;
}) {
  // 「本日お問い合わせ」を一覧ぶんまとめて集計（1クエリ）
  const inquiryMap = await getTodayInquiryMap(listings.map((l) => l.id));

  const className = view === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={className}>
      {listings.map((l) => (
        <ListingCard
          key={l.id}
          listing={l}
          favorited={favoritedIds?.has(l.id) ?? false}
          loggedIn={loggedIn}
          todayInquiries={inquiryMap[l.id] ?? 0}
          medianPrice={medianPrice}
          variant={view}
        />
      ))}
    </div>
  );
}
