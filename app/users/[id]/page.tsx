import { notFound } from 'next/navigation';
import { MapPin, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingGrid } from '@/components/ListingGrid';
import { RatingStars } from '@/components/RatingStars';
import { ReportDialog } from '@/components/ReportDialog';
import { FollowButton } from '@/components/FollowButton';
import { favoritedSet } from '@/lib/favorites';
import { formatDate } from '@/lib/format';
import type { ListingWithImages, Profile, ReviewWithReviewer } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function UserProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!profile) notFound();
  const p = profile as Profile;

  const { data: reviewRows } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, display_name)')
    .eq('reviewee_id', id)
    .order('created_at', { ascending: false });
  const reviews = (reviewRows ?? []) as unknown as ReviewWithReviewer[];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const { data: listingRows } = await supabase
    .from('listings')
    .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url)')
    .eq('seller_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  const listings = (listingRows ?? []) as unknown as ListingWithImages[];
  const favoritedIds = await favoritedSet(supabase, user?.id, listings.map((l) => l.id));

  // フォロー状態
  let isFollowing = false;
  if (user && user.id !== id) {
    const { count } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('follower_id', user.id)
      .eq('following_id', id);
    isFollowing = (count ?? 0) > 0;
  }

  return (
    <div className="space-y-8">
      {/* プロフィール */}
      <section className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 text-2xl font-bold text-navy-500">
            {p.display_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">{p.display_name}</h1>
              {p.kyc_status === 'verified' && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> 本人確認済み
                </span>
              )}
            </div>
            {p.prefecture && (
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {p.prefecture}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2">
              <RatingStars value={avg} />
              <span className="text-sm font-bold text-slate-600">
                {reviews.length ? `${avg.toFixed(1)}（${reviews.length}件）` : '評価なし'}
              </span>
            </div>
          </div>
        </div>
        {p.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{p.bio}</p>}
        {user && user.id !== p.id && (
          <div className="mt-3 flex items-center justify-between">
            <FollowButton targetUserId={p.id} initialFollowing={isFollowing} loggedIn={!!user} />
            <ReportDialog targetType="user" targetId={p.id} loggedIn={!!user} label="このユーザーを通報" />
          </div>
        )}
      </section>

      {/* 出品中 */}
      <section>
        <h2 className="mb-3 text-lg font-black">出品中の車両（{listings.length}）</h2>
        {listings.length > 0 ? (
          <ListingGrid listings={listings} favoritedIds={favoritedIds} loggedIn={!!user} />
        ) : (
          <p className="card p-6 text-center text-sm text-slate-500">現在出品中の車両はありません。</p>
        )}
      </section>

      {/* レビュー */}
      <section>
        <h2 className="mb-3 text-lg font-black">取引相手からの評価（{reviews.length}）</h2>
        {reviews.length > 0 ? (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <RatingStars value={r.rating} />
                  <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                <p className="mt-1 text-xs text-slate-400">— {r.reviewer?.display_name ?? '匿名'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-6 text-center text-sm text-slate-500">まだ評価はありません。</p>
        )}
      </section>
    </div>
  );
}
