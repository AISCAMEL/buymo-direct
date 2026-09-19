import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Gauge, Calendar, Fuel, Settings2, Palette, ShieldCheck, Eye, Heart, Hash } from 'lucide-react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatMileage, formatDate } from '@/lib/format';
import { startConversation } from './actions';
import { OwnerListingControls } from '@/components/OwnerListingControls';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ReportDialog } from '@/components/ReportDialog';
import { RatingStars } from '@/components/RatingStars';
import { ListingGallery } from '@/components/ListingGallery';
import { MaintenanceRecordsPanel } from '@/components/MaintenanceRecordsPanel';
import { FollowButton } from '@/components/FollowButton';
import { favoritedSet } from '@/lib/favorites';
import { LOAN_APR_FROM } from '@/lib/constants';
import { monthlyPayment } from '@/lib/loan';
import { MakeOfferButton } from '@/components/MakeOfferButton';
import { PriceAlertButton } from '@/components/PriceAlertButton';
import { InsuranceSimulator } from '@/components/InsuranceSimulatorLazy';
import type { ListingWithImages, MaintenanceRecord } from '@/lib/types';

export const revalidate = 300; // ISR: rebuild listing detail at most once per 5 minutes

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('listings')
    .select('title, maker, model, year, price, mileage_km, prefecture, description, listing_images(url, sort_order)')
    .eq('id', id)
    .maybeSingle();

  if (!data) return { title: '出品が見つかりません' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const images = [...(d.listing_images ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  const firstImageUrl = images[0]?.url as string | undefined;
  const price = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(d.price);
  const desc =
    d.description?.slice(0, 110) ??
    `${d.maker} ${d.model} ${d.year}年 ${price}。BUYMO ダイレクト で個人間売買。`;
  const ogDesc = `${d.year}年 / ${(d.mileage_km ?? 0).toLocaleString()}km / ¥${(d.price ?? 0).toLocaleString()} — ${d.prefecture ?? ''}の中古車`;

  return {
    title: d.title,
    description: desc,
    keywords: [d.maker, d.model, `${d.year}年`, '中古車', '個人売買', 'C2C', d.prefecture].filter(Boolean),
    alternates: { canonical: `/listings/${id}` },
    openGraph: {
      title: `${d.title} | BUYMO ダイレクト`,
      description: ogDesc,
      url: `/listings/${id}`,
      type: 'website',
      images: firstImageUrl ? [{ url: firstImageUrl, width: 1200, height: 630, alt: d.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: d.title,
      description: `¥${(d.price ?? 0).toLocaleString()} / ${(d.mileage_km ?? 0).toLocaleString()}km`,
      images: firstImageUrl ? [firstImageUrl] : undefined,
    },
  };
}

function statusLabel(status: string): string {
  return (
    { active: '公開中', reserved: '商談中', sold: '売約済み', draft: '下書き', closed: '取り下げ中' }[status] ??
    status
  );
}

export default async function ListingDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('listings')
    .select('*, listing_images(*), profiles!listings_seller_id_fkey(id, display_name, prefecture, avatar_url, kyc_status)')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();
  const listing = data as unknown as ListingWithImages;
  const images = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const isOwner = user?.id === listing.seller_id;

  // 閲覧数カウント（自分の出品は除く）
  if (!isOwner) {
    await supabase.rpc('increment_listing_view', { p_listing_id: listing.id });
  }

  // 出品者の評価集計
  const { data: sellerReviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', listing.seller_id);
  const reviewCount = sellerReviews?.length ?? 0;
  const avgRating = reviewCount
    ? (sellerReviews as { rating: number }[]).reduce((s, r) => s + r.rating, 0) / reviewCount
    : 0;

  // お気に入り数・お気に入り状態
  const { count: favoriteCount } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listing.id);
  const favoritedIds = await favoritedSet(supabase, user?.id, [listing.id]);
  const isFavorited = favoritedIds.has(listing.id);

  // アクティブなオファーを取得（買主として）
  let existingOffer: { amount: number; status: string; counter_amount: number | null } | null = null;
  if (user && !isOwner) {
    const { data: offerRow } = await supabase
      .from('offers')
      .select('amount, status, counter_amount')
      .eq('listing_id', listing.id)
      .eq('buyer_id', user.id)
      .not('status', 'in', '(rejected,cancelled,expired)')
      .maybeSingle();
    existingOffer = (offerRow as typeof existingOffer) ?? null;
  }

  // 整備記録
  const { data: maintenanceRows } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('listing_id', listing.id)
    .order('performed_at', { ascending: false });
  const maintenanceRecords = (maintenanceRows ?? []) as MaintenanceRecord[];

  // フォロー状態（売主をフォローしているか）
  let isFollowing = false;
  if (user && !isOwner) {
    const { count } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('follower_id', user.id)
      .eq('following_id', listing.seller_id);
    isFollowing = (count ?? 0) > 0;
  }

  const specs = [
    { icon: Calendar, label: '年式', value: `${listing.year}年` },
    { icon: Gauge, label: '走行距離', value: formatMileage(listing.mileage_km) },
    { icon: MapPin, label: '地域', value: listing.prefecture },
    { icon: Settings2, label: 'ミッション', value: listing.transmission ?? '—' },
    { icon: Fuel, label: '燃料', value: listing.fuel ?? '—' },
    { icon: Palette, label: 'カラー', value: listing.color ?? '—' },
  ];

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

  function extractYouTubeId(url: string): string {
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Car',
            name: listing.title,
            description:
              listing.description ??
              `${listing.maker} ${listing.model} ${listing.year}年式 走行${listing.mileage_km.toLocaleString()}km`,
            image: images[0]?.url,
            brand: { '@type': 'Brand', name: listing.maker },
            model: listing.model,
            vehicleModelDate: String(listing.year),
            mileageFromOdometer: {
              '@type': 'QuantitativeValue',
              value: listing.mileage_km,
              unitCode: 'KMT',
            },
            offers: {
              '@type': 'Offer',
              price: listing.price,
              priceCurrency: 'JPY',
              availability:
                listing.status === 'active'
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/SoldOut',
              url: `${SITE_URL}/listings/${listing.id}`,
              seller: {
                '@type': 'Person',
                name: listing.profiles?.display_name ?? '出品者',
              },
            },
          }),
        }}
      />
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* 左：ギャラリーとスペック */}
      <div className="space-y-6">
        {/* ── ギャラリー ── */}
        <ListingGallery images={images} title={listing.title} />

        {/* ── メタ情報行 ── */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {((listing.view_count ?? 0) + 1).toLocaleString()} 回閲覧
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {(favoriteCount ?? 0).toLocaleString()} 件のお気に入り
          </span>
          <span>出品日：{formatDate(listing.created_at)}</span>
        </div>

        {/* ── 車両情報 ── */}
        <div className="card p-5">
          <h2 className="mb-3 font-bold">車両情報</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {specs.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <dt className="flex items-center gap-1 text-xs text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </dt>
                <dd className="mt-0.5 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <ShieldCheck
              className={`h-5 w-5 ${listing.repair_history ? 'text-red-500' : 'text-emerald-500'}`}
            />
            <span className="font-bold">
              修復歴：{listing.repair_history ? 'あり' : 'なし'}
            </span>
          </div>
        </div>

        {listing.description && (
          <div className="card p-5">
            <h2 className="mb-2 font-bold">出品者からのコメント</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
          </div>
        )}

        {/* VIN */}
        {listing.vin && (
          <div className="card flex items-center gap-2 p-4 text-sm">
            <Hash className="h-4 w-4 shrink-0 text-navy-400" />
            <span className="text-slate-500">車台番号（VIN）：</span>
            <span className="font-mono font-bold tracking-wider">{listing.vin}</span>
          </div>
        )}

        {/* 動画 */}
        {listing.video_url && (
          <div className="card overflow-hidden p-0">
            <div className="aspect-video w-full">
              {listing.video_url.includes('youtube.com') || listing.video_url.includes('youtu.be') ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(listing.video_url)}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={listing.video_url} controls className="h-full w-full object-contain bg-black" />
              )}
            </div>
          </div>
        )}

        {/* 整備記録 */}
        <MaintenanceRecordsPanel
          listingId={listing.id}
          records={maintenanceRecords}
          isOwner={isOwner}
        />
      </div>

      {/* 右：価格・アクション・売主 */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden p-5">
          {/* ステータスバッジ */}
          {listing.status !== 'active' && (
            <div
              className={`mb-3 rounded-lg p-2 text-center text-sm font-bold ${
                listing.status === 'sold'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {statusLabel(listing.status)}
            </div>
          )}

          <p className="text-xs font-bold text-accent-600">
            {listing.maker} {listing.model}
          </p>
          <h1 className="mt-1 text-lg font-black leading-snug">{listing.title}</h1>

          <p className="mt-3 text-3xl font-black text-navy-600">{formatYen(listing.price)}</p>
          <p className="mt-1 text-sm text-slate-600">
            ローン月々{' '}
            <span className="font-bold text-navy-600">
              {formatYen(monthlyPayment(listing.price, LOAN_APR_FROM, 60))}〜
            </span>
            <span className="ml-1 text-xs text-slate-400">
              （60回・年率{LOAN_APR_FROM}%・頭金0の目安）
            </span>
          </p>
          <Link
            href={`/loan/apply?listing=${listing.id}`}
            className="mt-1 inline-block text-xs font-bold text-accent-600 hover:underline"
          >
            ローン仮審査を申し込む →
          </Link>

          {/* 安心バナー（買取保証・エスクロー） */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gold-50 px-3 py-2.5 text-xs font-bold text-gold-600">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            買取保証つき／エスクロー決済で安全に取引
          </div>
          <ul className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-slate-600">
            <li className="rounded-lg bg-slate-50 px-1 py-1.5">代金は<br />第三者保全</li>
            <li className="rounded-lg bg-slate-50 px-1 py-1.5">現車確認<br />してから</li>
            <li className="rounded-lg bg-slate-50 px-1 py-1.5">名義変更<br />まで代行</li>
          </ul>

          {/* 保険料シミュレーター */}
          <div className="mt-4">
            <InsuranceSimulator
              vehiclePrice={listing.price}
              year={listing.year}
              maker={listing.maker}
            />
          </div>

          {isOwner ? (
            <div className="mt-5 space-y-3">
              <p className="rounded-lg bg-slate-50 p-2 text-center text-xs text-slate-500">
                これはあなたの出品です（{statusLabel(listing.status)}）
              </p>
              <OwnerListingControls listingId={listing.id} status={listing.status} />
            </div>
          ) : listing.status === 'active' ? (
            <div className="mt-5 space-y-3">
              <form action={startConversation}>
                <input type="hidden" name="listing_id" value={listing.id} />
                <button className="btn-accent w-full py-3.5 text-base shadow-sm">
                  出品者にメッセージを送る
                </button>
              </form>
              {user && !isOwner && (
                <MakeOfferButton
                  listingId={listing.id}
                  listingPrice={listing.price}
                  existingOffer={existingOffer}
                />
              )}
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={isFavorited}
                loggedIn={!!user}
                variant="full"
              />
              <div className="flex justify-center">
                <PriceAlertButton
                  listingId={listing.id}
                  currentPrice={listing.price}
                  title={listing.title}
                />
              </div>
              <p className="text-center text-xs text-slate-400">
                価格交渉またはメッセージで合意後にエスクロー取引を開始します。
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-slate-100 p-3 text-center text-sm font-bold text-slate-500">
                {listing.status === 'reserved' ? '商談中の車両です' : 'この車両は売約済みです'}
              </div>
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={isFavorited}
                loggedIn={!!user}
                variant="full"
              />
            </div>
          )}
        </div>

        {/* 出品者カード */}
        <div className="card p-4 space-y-3">
          <Link href={`/users/${listing.seller_id}`} className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-100 text-lg font-black text-navy-500">
              {(listing.profiles?.display_name ?? '?').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">出品者</p>
              <div className="flex items-center gap-1.5">
                <p className="font-bold">{listing.profiles?.display_name ?? '出品者'}</p>
                {(listing.profiles as any)?.kyc_status === 'verified' && (
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> 本人確認済み
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <RatingStars value={avgRating} />
                <span className="text-xs text-slate-500">
                  {reviewCount ? `${avgRating.toFixed(1)}（${reviewCount}件）` : '評価なし'}
                </span>
              </div>
            </div>
          </Link>
          {user && !isOwner && (
            <div className="flex justify-end border-t border-slate-100 pt-2">
              <FollowButton
                targetUserId={listing.seller_id}
                initialFollowing={isFollowing}
                loggedIn={!!user}
              />
            </div>
          )}
        </div>

        {!isOwner && (
          <div className="px-1 text-right">
            <ReportDialog
              targetType="listing"
              targetId={listing.id}
              loggedIn={!!user}
              label="この出品を通報"
            />
          </div>
        )}
      </aside>
    </div>
    </>
  );
}
