import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Gauge, Calendar, Fuel, Settings2, Palette, ShieldCheck, Eye, Heart, Hash, Banknote, Tag, ArrowRight, Check, Calculator, ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatMileage, formatDate } from '@/lib/format';
import { startConversation } from './actions';
import { requestVehicleQuote } from '@/app/cases/actions';
import { OwnerListingControls } from '@/components/OwnerListingControls';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ReportDialog } from '@/components/ReportDialog';
import { RatingStars } from '@/components/RatingStars';
import { ListingGallery } from '@/components/ListingGallery';
import { MaintenanceRecordsPanel } from '@/components/MaintenanceRecordsPanel';
import { FollowButton } from '@/components/FollowButton';
import { favoritedSet } from '@/lib/favorites';
import { ListingGrid } from '@/components/ListingGrid';
import { getRelatedListings } from '@/lib/related';
import { computeMarketStats } from '@/lib/market';
import { PriceAssessment } from '@/components/PriceAssessment';
import { LoanSimulator } from '@/components/LoanSimulator';
import { RecordView, RecentlyViewed } from '@/components/RecentlyViewed';
import { ShareButton } from '@/components/ShareButton';
import { LOAN_APR_FROM } from '@/lib/constants';
import { monthlyPayment } from '@/lib/loan';
import { MakeOfferButton } from '@/components/MakeOfferButton';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { getPricingConfig } from '@/lib/settings';
import { sellerKind, SELLER_KIND_LABEL, SELLER_KIND_CLS, SELLER_KIND_NOTE } from '@/lib/listing-kind';
import { businessDisplayName, invoiceLabel, BUSINESS_TYPE_LABEL, TAX_STATUS_LABEL, type BusinessType, type TaxStatus } from '@/lib/business';
import { totalPayment, hasBreakdown } from '@/lib/listing-pricing';
import { getDealerForUser } from '@/lib/dealer';
import { canSeePremium } from '@/lib/membership';
import { PremiumGate } from '@/components/PremiumGate';
import { PriceAlertButton } from '@/components/PriceAlertButton';
import { InsuranceSimulator } from '@/components/InsuranceSimulatorLazy';
import type { ListingWithImages, MaintenanceRecord } from '@/lib/types';
import { getListingActivity } from '@/lib/activity';
import { ListingActivityBanner } from '@/components/ListingActivityBanner';

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
  const pricing = await getPricingConfig();

  // 販売店（加盟店）の事業者・インボイス情報（ダイレクト販売時に表示）
  type DealerBiz = {
    id: string; name: string | null; business_type: string | null; company_name: string | null;
    trade_name: string | null; representative: string | null; corporate_number: string | null;
    antique_license_no: string | null; tax_status: string | null;
    invoice_registered: boolean | null; invoice_number: string | null;
  };
  const listingDealerId = (listing as unknown as { dealer_id?: string | null }).dealer_id ?? null;
  let dealerBiz: DealerBiz | null = null;
  if (listingDealerId) {
    const { data: dz } = await supabase
      .from('dealers')
      .select('id, name, business_type, company_name, trade_name, representative, corporate_number, antique_license_no, tax_status, invoice_registered, invoice_number')
      .eq('id', listingDealerId)
      .maybeSingle();
    dealerBiz = (dz as DealerBiz | null) ?? null;
  }
  const images = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const isOwner = user?.id === listing.seller_id;

  // プレミアム（会員限定）領域の閲覧可否
  let viewerTier: string | null = null;
  let viewerIsAdmin = false;
  let viewerIsDealer = false;
  if (user) {
    const { data: vp } = await supabase.from('profiles').select('member_tier, role').eq('id', user.id).maybeSingle();
    viewerTier = (vp as { member_tier?: string } | null)?.member_tier ?? 'free';
    viewerIsAdmin = (vp as { role?: string } | null)?.role === 'admin';
    viewerIsDealer = (await getDealerForUser(user.id)) !== null;
  }
  const premiumUnlocked = canSeePremium({ tier: viewerTier, isDealer: viewerIsDealer, isAdmin: viewerIsAdmin });

  // 閲覧数カウント（自分の出品は除く）。描画をブロックしないよう非同期で実行。
  if (!isOwner) {
    void supabase.rpc('increment_listing_view', { p_listing_id: listing.id }).then(() => {}, () => {});
  }

  // 独立した集計はまとめて並列取得（DB往復を削減して高速化）
  const [reviewsRes, favCountRes, favoritedIds, activity] = await Promise.all([
    supabase.from('reviews').select('rating').eq('reviewee_id', listing.seller_id),
    supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('listing_id', listing.id),
    favoritedSet(supabase, user?.id, [listing.id]),
    getListingActivity(listing.id, {
      views: (listing.view_count ?? 0) + (isOwner ? 0 : 1),
      status: listing.status,
    }),
  ]);
  const sellerReviews = reviewsRes.data;
  const reviewCount = sellerReviews?.length ?? 0;
  const avgRating = reviewCount
    ? (sellerReviews as { rating: number }[]).reduce((s, r) => s + r.rating, 0) / reviewCount
    : 0;
  const favoriteCount = favCountRes.count;
  const isFavorited = favoritedIds.has(listing.id);

  // 相場評価：同条件（同メーカー・車種・年式±2年）の他の現役出品から中央値を算出
  let marketMedian: number | null = null;
  let marketSample = 0;
  if (listing.maker && listing.model && listing.year) {
    const { data: compRows } = await supabase
      .from('listings')
      .select('price, mileage_km, year')
      .eq('status', 'active')
      .eq('maker', listing.maker)
      .eq('model', listing.model)
      .gte('year', listing.year - 2)
      .lte('year', listing.year + 2)
      .neq('id', listing.id)
      .range(0, 499);
    const cs = computeMarketStats(
      (compRows ?? []) as { price: number | null; mileage_km: number | null; year: number | null }[],
      (compRows ?? []).length,
    );
    if (cs) {
      marketMedian = cs.medianPrice;
      marketSample = cs.sample;
    }
  }

  // 関連・類似のおすすめ車両（＋お気に入り状態）
  const relatedListings = await getRelatedListings(supabase, listing);
  const relatedFavs = relatedListings.length
    ? await favoritedSet(supabase, user?.id, relatedListings.map((l) => l.id))
    : new Set<string>();

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

        {/* ── 気になる動線（動きの可視化） ── */}
        <ListingActivityBanner activity={activity} />

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

        {listing.owner_comment && (
          <div className="card border-gold-200 bg-gold-50/40 p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-500 text-sm font-black text-white">
                {(listing.profiles?.display_name ?? '?').charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-black text-navy-800">
                  {listing.profiles?.display_name ?? '出品者'} さん
                  <span className={`badge ${SELLER_KIND_CLS[sellerKind(listing)]}`}>{SELLER_KIND_LABEL[sellerKind(listing)]}</span>
                </p>
                <p className="text-[11px] font-bold text-gold-700">オーナーからのひとこと</p>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.owner_comment}
            </p>
          </div>
        )}

        {listing.description && (
          <div className="card p-5">
            <h2 className="mb-2 font-bold">出品者からのコメント</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
          </div>
        )}

        {/* 装備・オプション */}
        {listing.equipment && listing.equipment.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-bold">装備・オプション</h2>
            <div className="flex flex-wrap gap-2">
              {listing.equipment.map((eq) => (
                <span key={eq} className="inline-flex items-center gap-1 rounded-full border border-navy-100 bg-navy-50 px-3 py-1.5 text-xs font-bold text-navy-700">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />{eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 型式・車台番号 */}
        {(listing.vin || listing.type_code) && (
          <div className="card flex flex-wrap items-center gap-x-5 gap-y-1 p-4 text-sm">
            {listing.type_code && (
              <span className="flex items-center gap-2">
                <Hash className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="text-slate-500">型式：</span>
                <span className="font-mono font-bold tracking-wider">{listing.type_code}</span>
              </span>
            )}
            {listing.vin && (
              <span className="flex items-center gap-2">
                <Hash className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="text-slate-500">車台番号（VIN）：</span>
                <span className="font-mono font-bold tracking-wider">{listing.vin}</span>
              </span>
            )}
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

          <div className="flex items-center gap-2">
            <span className={`badge shadow-sm ${SELLER_KIND_CLS[sellerKind(listing)]}`}>
              {SELLER_KIND_LABEL[sellerKind(listing)]}出品
            </span>
            <p className="text-xs font-bold text-accent-600">
              {listing.maker} {listing.model}
            </p>
          </div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <h1 className="text-lg font-black leading-snug">{listing.title}</h1>
            <ShareButton
              compact
              className="shrink-0"
              url={`${SITE_URL}/listings/${listing.id}`}
              title={`${listing.maker} ${listing.model}（${listing.year}年）${formatYen(listing.price)}｜BUYMO ダイレクト`}
            />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{SELLER_KIND_NOTE[sellerKind(listing)]}</p>

          <p className="mt-3 text-3xl font-black text-navy-600">{formatYen(listing.price)}</p>
          {marketMedian && listing.status === 'active' && (
            <PriceAssessment price={listing.price} median={marketMedian} sample={marketSample} />
          )}
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

          <details className="group mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-navy-700">
              <span className="flex items-center gap-1.5"><Calculator className="h-4 w-4 text-navy-500" />ローン返済シミュレーション</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="mt-3">
              <LoanSimulator principal={listing.price} aprFrom={LOAN_APR_FROM} />
            </div>
          </details>

          {(() => {
            const lp = listing as unknown as {
              price: number; registration_fee?: number | null; recycle_fee?: number | null;
              warranty_fee?: number | null; delivery_fee?: number | null; misc_fees?: number | null;
              tax_amount?: number | null; sale_terms?: string | null;
            };
            // 加盟店ダイレクト販売で価格内訳が入力済みなら「お支払い総額」を表示
            if (dealerBiz && hasBreakdown(lp)) {
              const rows: [string, number | null | undefined][] = [
                ['車両本体価格', lp.price],
                ['登録費用', lp.registration_fee],
                ['リサイクル料金', lp.recycle_fee],
                ['保証料', lp.warranty_fee],
                ['納車費用', lp.delivery_fee],
                ['諸費用', lp.misc_fees],
              ];
              return (
                <div className="mt-4 rounded-xl border border-navy-100 p-3">
                  <p className="mb-2 text-xs font-bold text-slate-500">お支払い総額（税込）</p>
                  <p className="mb-2 text-2xl font-black text-navy-700">{formatYen(totalPayment(lp))}</p>
                  <dl className="space-y-1 text-xs text-slate-600">
                    {rows.filter(([, v]) => typeof v === 'number' && v > 0).map(([label, v]) => (
                      <div key={label} className="flex justify-between"><dt className="text-slate-400">{label}</dt><dd className="font-bold">{formatYen(v as number)}</dd></div>
                    ))}
                    {typeof lp.tax_amount === 'number' && lp.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-400"><dt>（うち消費税）</dt><dd>{formatYen(lp.tax_amount)}</dd></div>
                    )}
                  </dl>
                  {lp.sale_terms && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">販売条件: {lp.sale_terms}</p>}
                </div>
              );
            }
            // 個人出品：現金でのお支払い目安（エスクロー＋名義変更 等）
            return (
              <PriceBreakdown
                price={listing.price}
                vehicle={{ year: listing.year, mileageKm: listing.mileage_km, maker: listing.maker, bodyType: listing.body_type }}
                pricing={pricing}
              />
            );
          })()}

          {/* 安心バナー（チャットで納得 → エスクロー） */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gold-50 px-3 py-2.5 text-xs font-bold text-gold-600">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            チャットで納得 → エスクローで安全に購入
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            オンラインで完結もOK。気になる点はチャットで質問、ご希望なら<strong className="text-slate-700">現車確認（見に行く）・試乗</strong>も相談できます。<strong className="text-slate-700">納得してから</strong>ご購入ください。
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-slate-600">
            <li className="rounded-lg bg-slate-50 px-1 py-1.5">代金は<br />第三者保全</li>
            <li className="rounded-lg bg-slate-50 px-1 py-1.5">チャットで<br />納得してから</li>
            <li className="rounded-lg bg-slate-50 px-1 py-1.5">名義変更<br />まで代行</li>
          </ul>

          {/* プロ向け情報（会員限定） */}
          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <span className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] text-navy-700">PRO</span>
              プロ向け情報（相場・仕入れ）
            </p>
            <PremiumGate unlocked={premiumUnlocked} loggedIn={!!user} source={`listing:${listing.id}`}
              title="プロ向けの相場情報は会員限定です"
              note="AI相場レンジや仕入れの目安は、加盟店・有料会員のみ閲覧できます。無料のプロ登録で解放されます。">
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <dl className="space-y-1 text-slate-600">
                  <div className="flex justify-between"><dt className="text-slate-400">AI相場レンジ</dt>
                    <dd className="font-bold">{formatYen(listing.ai_price_min ?? listing.price)} 〜 {formatYen(listing.ai_price_max ?? listing.price)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">掲載価格との差</dt>
                    <dd className="font-bold">{formatYen(listing.price)}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-slate-400">※ 相場は参考値です。仕入れ・業販のご相談は本部・加盟店窓口へ。</p>
              </div>
            </PremiumGate>
          </div>

          {/* 販売店（加盟店ダイレクト販売）の事業者・インボイス情報 */}
          {dealerBiz ? (
            <div className="mt-4 rounded-xl border border-navy-100 bg-navy-50/40 p-3 text-xs">
              <p className="mb-1.5 flex items-center gap-1.5 font-bold text-navy-700">
                <span className="badge bg-navy-500 text-white">販売店</span>
                販売店から購入（B2C）
              </p>
              <dl className="space-y-0.5 text-slate-600">
                <div className="flex justify-between gap-2"><dt className="text-slate-400">販売者</dt><dd className="text-right font-bold">{businessDisplayName(dealerBiz)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-400">事業者区分</dt><dd className="text-right">{BUSINESS_TYPE_LABEL[(dealerBiz.business_type as BusinessType) ?? 'corporation']}{dealerBiz.representative ? `／代表 ${dealerBiz.representative}` : ''}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-400">消費税</dt><dd className="text-right">{TAX_STATUS_LABEL[(dealerBiz.tax_status as TaxStatus) ?? 'taxable']}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-400">インボイス</dt><dd className="text-right">{invoiceLabel(dealerBiz)}</dd></div>
                {dealerBiz.antique_license_no && (
                  <div className="flex justify-between gap-2"><dt className="text-slate-400">古物商許可</dt><dd className="text-right">{dealerBiz.antique_license_no}</dd></div>
                )}
              </dl>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
              個人オーナーによる出品（個人間売買）です。消費税・インボイスの対象外です。
            </p>
          )}

          {isOwner ? (
            <div className="mt-5 space-y-3">
              <p className="rounded-lg bg-slate-50 p-2 text-center text-xs text-slate-500">
                これはあなたの出品です（{statusLabel(listing.status)}）
              </p>
              <OwnerListingControls listingId={listing.id} status={listing.status} />
            </div>
          ) : listing.status === 'active' ? (
            <div className="mt-5 space-y-3">
              {dealerBiz && (
                <form action={requestVehicleQuote.bind(null, listing.id)}>
                  <button className="btn-accent w-full py-3.5 text-base shadow-sm">
                    見積・購入を相談する（無料）
                  </button>
                  <p className="mt-1 text-center text-xs text-slate-400">販売店へ相談が届き、お見積りをご案内します。</p>
                </form>
              )}
              <form action={startConversation}>
                <input type="hidden" name="listing_id" value={listing.id} />
                <button className={`w-full py-3.5 text-base shadow-sm ${dealerBiz ? 'btn-outline' : 'btn-accent'}`}>
                  {dealerBiz ? '販売店にメッセージを送る' : '出品者にメッセージを送る'}
                </button>
              </form>

              {/* クイックアクション：定型メッセージで会話を開始 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { intent: 'visit', label: '見に行く', sub: '現車確認' },
                  { intent: 'testdrive', label: '試乗を相談', sub: '可否を確認' },
                  { intent: 'condition', label: '状態を質問', sub: 'キズ・記録' },
                ].map((o) => (
                  <form key={o.intent} action={startConversation}>
                    <input type="hidden" name="listing_id" value={listing.id} />
                    <input type="hidden" name="intent" value={o.intent} />
                    <button className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-600 hover:border-navy-200 hover:bg-slate-50">
                      {o.label}
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{o.sub}</span>
                    </button>
                  </form>
                ))}
              </div>
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

      {/* 関連・類似のおすすめ車両 */}
      {relatedListings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-black">この車に関連するおすすめ</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">
            同じ車種・似たモデル・同じボディタイプから、気になる1台を。
          </p>
          <ListingGrid listings={relatedListings} favoritedIds={relatedFavs} loggedIn={!!user} />
        </section>
      )}

      {/* 閲覧履歴の記録＋最近見た車 */}
      <RecordView
        item={{
          id: listing.id,
          title: listing.title,
          price: listing.price,
          cover: images[0]?.url ?? null,
          maker: listing.maker,
          model: listing.model,
        }}
      />
      <div className="mt-10">
        <RecentlyViewed excludeId={listing.id} />
      </div>

      {/* 保険料シミュレーター（全幅で見やすく） */}
      <section className="mt-8">
        <InsuranceSimulator
          vehiclePrice={listing.price}
          year={listing.year}
          maker={listing.maker}
        />
      </section>

      {/* 統合訴求：乗り換え・売却クロスセル */}
      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-navy-700 to-navy-500 p-6 text-white sm:p-8">
        <span className="inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取＋ダイレクト 完全1本化</span>
        <h2 className="mt-3 text-xl font-black sm:text-2xl">お乗り換え・ご売却をお考えの方へ</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/85">
          BUYMO なら「すぐ現金化の買取（手数料0円）」も「より高く売るダイレクト販売」も選べます。査定は無料・全国オンライン完結です。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/listings/valuation" className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-black text-[#2E2408] transition hover:bg-gold-600">
            <Banknote className="h-4 w-4" /> 無料査定を依頼（買取）
          </Link>
          <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25">
            <Tag className="h-4 w-4" /> 出品する（ダイレクト） <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
