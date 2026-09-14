import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building2, MapPin, Globe, Phone, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/ListingCard';
import type { ListingWithImages } from '@/lib/types';

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
  const desc = data.description?.slice(0, 120) ?? `${data.name}（${data.prefecture ?? ''}）の中古車在庫をBUYMO C2Cで見る。`;

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
    .select('id, name, company_name, prefecture, address, phone, website_url, logo_url, description, status, approved_at')
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

  return (
    <div className="space-y-8">
      {/* Dealer header */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {dealer.logo_url ? (
            <img src={dealer.logo_url} alt={dealer.name} className="h-20 w-auto object-contain rounded-lg" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-navy-100">
              <Building2 className="h-10 w-10 text-navy-400" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-black text-navy-800">{dealer.name}</h1>
            {dealer.company_name && <p className="text-slate-500">{dealer.company_name}</p>}
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
              {dealer.website_url && (
                <a
                  href={dealer.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-navy-600"
                >
                  <Globe className="h-4 w-4" />
                  公式サイト
                </a>
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
