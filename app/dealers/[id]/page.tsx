import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building2, MapPin, Globe, Phone, Package, Wrench, MessageSquare, Car, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/ListingCard';
import { RequestPartnerForm } from '@/components/RequestPartnerForm';
import { StarRating } from '@/components/StarRating';
import { normalizeStyle, deriveStyle, isMobile, SERVICE_STYLE_LABEL } from '@/lib/service-style';
import { skillLabel } from '@/lib/cases';
import { skillCategory } from '@/lib/matching-fee';
import { formatYen } from '@/lib/format';
import type { ListingWithImages } from '@/lib/types';

type PartnerSkill = { skill_key: string; price_from: number | null; area: string | null; note: string | null };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('dealers')
    .select('name, description, prefecture, logo_url')
    .eq('id', id)
    .maybeSingle();

  if (!data) return { title: '加盟店' };

  const title = `${data.name} | BUYMO 加盟店`;
  const desc = data.description?.slice(0, 120) ?? `${data.name}（${data.prefecture ?? ''}）の中古車在庫をBUYMO ダイレクトで見る。`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/dealers/${id}` },
    openGraph: {
      type: 'website',
      title,
      description: desc,
      images: data.logo_url ? [{ url: data.logo_url, width: 400, height: 400, alt: data.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: data.name,
      description: desc,
      images: data.logo_url ? [data.logo_url] : undefined,
    },
  };
}

export default async function DealerShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const s = supabase as any;

  const { data: dealer } = await s
    .from('dealers')
    .select('id, owner_id, name, company_name, prefecture, address, phone, website_url, logo_url, description, status, approved_at, tagline, cover_url, rep_name, rep_photo_url, rep_message, business_hours, holidays, established, service_area, instagram_url, line_url, gallery')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (!dealer) notFound();

  const { data: listings } = await s
    .from('listings')
    .select('id, title, maker, model, year, mileage_km, price, prefecture, status, boosted_until, created_at, listing_images(id, url, position)')
    .eq('dealer_id', id)
    .eq('status', 'active')
    .order('boosted_until', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(48);

  const { count: soldCount } = await s
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', id)
    .eq('status', 'sold');

  // 提供スキル（スキルマーケット）
  const { data: skillRows } = await s
    .from('partner_skills')
    .select('skill_key, price_from, area, note')
    .eq('dealer_id', id)
    .eq('active', true);
  const skills = (skillRows ?? []) as PartnerSkill[];
  const skillKeys = skills.map((sk) => sk.skill_key);

  // 口コミ（レビュー）：この加盟店オーナー宛ての相互評価
  const { data: reviewRows } = await s
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id')
    .eq('reviewee_id', dealer.owner_id)
    .order('created_at', { ascending: false })
    .limit(20);
  const reviews = (reviewRows ?? []) as { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string }[];
  const reviewCount = reviews.length;
  const reviewAvg = reviewCount ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
  // レビュアー名
  const reviewerIds = Array.from(new Set(reviews.map((r) => r.reviewer_id)));
  const { data: reviewerProfiles } = reviewerIds.length
    ? await s.from('profiles').select('id, display_name, avatar_url').in('id', reviewerIds)
    : { data: [] };
  const reviewerMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
  for (const p of (reviewerProfiles ?? []) as { id: string; display_name: string; avatar_url: string | null }[]) {
    reviewerMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
  }

  // 営業形態（カラムがあれば採用、無ければテキストから推定）
  const { data: styleRow } = await s.from('dealers').select('service_style').eq('id', id).maybeSingle();
  const serviceStyle = styleRow?.service_style
    ? normalizeStyle(styleRow.service_style)
    : deriveStyle(dealer.service_area, dealer.description, dealer.tagline);
  const mobile = isMobile(serviceStyle);

  const gallery: string[] = Array.isArray(dealer.gallery) ? dealer.gallery : [];

  return (
    <div className="space-y-8">
      {/* Cover */}
      {dealer.cover_url && (
        <div className="-mx-4 -mt-6 aspect-[3/1] max-h-64 w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:w-full sm:rounded-2xl">
          <img src={dealer.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Dealer header */}
      <div className="card p-6">
        {dealer.tagline && <p className="mb-3 text-sm font-bold text-accent-600">{dealer.tagline}</p>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {dealer.logo_url ? (
            <img src={dealer.logo_url} alt={dealer.name} className="h-20 w-auto object-contain rounded-lg" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-navy-100">
              <Building2 className="h-10 w-10 text-navy-400" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-navy-800">{dealer.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${mobile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {mobile ? <Car className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}{SERVICE_STYLE_LABEL[serviceStyle]}
              </span>
            </div>
            {dealer.company_name && <p className="text-slate-500">{dealer.company_name}</p>}
            {mobile && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <Car className="h-3.5 w-3.5" />自宅・職場まで出張対応{dealer.service_area ? `（${dealer.service_area}）` : ''}
              </p>
            )}
            {dealer.description && <p className="mt-2 text-sm text-slate-600">{dealer.description}</p>}

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              {dealer.prefecture && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {dealer.prefecture}{dealer.address && `・${dealer.address}`}
                </span>
              )}
              {dealer.phone && (
                <a href={`tel:${dealer.phone}`} className="flex items-center gap-1 hover:text-navy-600">
                  <Phone className="h-4 w-4" />
                  {dealer.phone}
                </a>
              )}
              {dealer.service_area && (
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />対応: {dealer.service_area}</span>
              )}
              {dealer.business_hours && <span>🕒 {dealer.business_hours}</span>}
              {dealer.holidays && <span>定休: {dealer.holidays}</span>}
              {dealer.established && <span>創業 {dealer.established}</span>}
              {dealer.website_url && (
                <a href={dealer.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-navy-600">
                  <Globe className="h-4 w-4" />公式サイト
                </a>
              )}
              {dealer.instagram_url && (
                <a href={dealer.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-navy-600">Instagram</a>
              )}
              {dealer.line_url && (
                <a href={dealer.line_url} target="_blank" rel="noopener noreferrer" className="hover:text-navy-600">LINE</a>
              )}
            </div>
          </div>

          <div className="flex gap-4 text-center shrink-0">
            <div>
              <p className="text-2xl font-black text-navy-700">{listings?.length ?? 0}</p>
              <p className="text-xs text-slate-400">公開中</p>
            </div>
            <div>
              <p className="text-2xl font-black text-navy-700">{soldCount ?? 0}</p>
              <p className="text-xs text-slate-400">成約</p>
            </div>
          </div>
        </div>
      </div>

      {/* 担当者紹介 */}
      {(dealer.rep_name || dealer.rep_photo_url || dealer.rep_message) && (
        <div className="card flex items-start gap-4 p-6">
          {dealer.rep_photo_url ? (
            <img src={dealer.rep_photo_url} alt={dealer.rep_name ?? '担当者'} className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-navy-100 text-2xl">🧑‍🔧</div>
          )}
          <div>
            <p className="text-xs font-bold text-slate-400">担当者</p>
            {dealer.rep_name && <p className="text-lg font-black text-navy-800">{dealer.rep_name}</p>}
            {dealer.rep_message && <p className="mt-1 text-sm text-slate-600">{dealer.rep_message}</p>}
          </div>
        </div>
      )}

      {/* お店の雰囲気（ギャラリー） */}
      {gallery.length > 0 && (
        <div>
          <h2 className="mb-3 font-black text-navy-800">お店の雰囲気</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((u, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl border border-slate-200">
                <img src={u} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 提供サービス（スキルマーケット）＋依頼CTA */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-navy-400" />
            <h2 className="font-black text-navy-800">対応サービス</h2>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-slate-400">登録されているサービスはまだありません。査定・整備などのご相談は「このプロに依頼」からどうぞ。</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {skills.map((sk) => (
                <div key={sk.skill_key} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-navy-800">{skillLabel(sk.skill_key)}</p>
                    <span className="shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-600">{skillCategory(sk.skill_key)}</span>
                  </div>
                  <p className="mt-1 text-lg font-black tabular-nums text-accent-600">
                    {sk.price_from != null ? <>{formatYen(sk.price_from)}<span className="text-sm font-bold">〜</span></> : <span className="text-base">要見積り</span>}
                  </p>
                  {sk.area && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />対応エリア: {sk.area}</p>}
                  {sk.note && <p className="mt-1 text-xs text-slate-500">{sk.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:pt-10">
          <RequestPartnerForm dealerId={dealer.id} skillKeys={skillKeys} />
        </div>
      </div>

      {/* 口コミ（レビュー） */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-navy-400" />
            <h2 className="font-black text-navy-800">口コミ・評価</h2>
          </div>
          {reviewCount > 0 && <StarRating value={reviewAvg} count={reviewCount} size="md" />}
        </div>
        {reviewCount === 0 ? (
          <p className="card p-8 text-center text-sm text-slate-400">取引完了後の口コミがここに表示されます。</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => {
              const who = reviewerMap[r.reviewer_id];
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {who?.avatar_url ? (
                        <img src={who.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm">🙂</div>
                      )}
                      <span className="text-sm font-bold text-slate-700">{who?.display_name ?? '利用者'}</span>
                    </div>
                    <StarRating value={r.rating} />
                  </div>
                  {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(r.created_at).toLocaleDateString('ja-JP')}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Listings */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-navy-400" />
          <h2 className="font-black text-navy-800">在庫一覧</h2>
          <span className="ml-auto text-sm text-slate-400">{listings?.length ?? 0}台</span>
        </div>

        {(!listings || listings.length === 0) ? (
          <p className="py-16 text-center text-slate-400">現在公開中の在庫はありません</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l: ListingWithImages) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/dealers" className="text-sm text-navy-600 hover:underline">
          ← 加盟店一覧に戻る
        </Link>
      </div>
    </div>
  );
}
