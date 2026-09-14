import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bot } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ListingForm } from '@/components/ListingForm';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/sell');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="mb-0.5 text-2xl font-black">車を出品する</h1>
          <p className="text-sm text-slate-500">写真と車両情報を入力して出品しましょう。出品は無料です。</p>
        </div>
        <Link
          href="/listings/sell-wizard"
          className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <Bot className="h-3.5 w-3.5" />
          AI相場診断から始める
        </Link>
      </div>
      <Suspense>
        <ListingForm userId={user.id} />
      </Suspense>
    </div>
  );
}
