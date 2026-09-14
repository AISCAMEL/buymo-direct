import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingForm } from '@/components/ListingForm';
import type { Listing, ListingImage } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function EditListingPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/listings/${id}/edit`);

  const { data } = await supabase
    .from('listings')
    .select('*, listing_images(*)')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();
  const listing = data as Listing & { listing_images: ListingImage[] };

  // 売主本人のみ編集可
  if (listing.seller_id !== user.id) redirect(`/listings/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/listings" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 出品管理へ
      </Link>
      <h1 className="mb-1 text-2xl font-black">出品を編集する</h1>
      <p className="mb-6 text-sm text-slate-500">内容を更新します。写真の追加・削除も可能です。</p>
      <ListingForm userId={user.id} listing={listing} existingImages={listing.listing_images ?? []} />
    </div>
  );
}
