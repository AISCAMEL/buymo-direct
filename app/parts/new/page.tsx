import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gavel } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PartAuctionForm } from '@/components/PartAuctionForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'パーツを出品する | BUYMO ダイレクト' };

export default async function NewPartAuctionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/parts/new');

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-2">
      <Link href="/parts" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> パーツオークション一覧
      </Link>
      <div className="flex items-center gap-2">
        <Gavel className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">パーツを出品する</h1>
      </div>
      <PartAuctionForm />
    </div>
  );
}
