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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-0.5 text-2xl font-black">出品して、もっと高く売る</h1>
          <p className="text-sm text-slate-500">写真と車両情報を入力するだけ。出品は無料、売れなくても買取保証つきで安心です。</p>
        </div>
        <Link
          href="/listings/sell-wizard"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-xs font-bold text-gold-600 transition-colors hover:bg-gold-100"
        >
          <Bot className="h-3.5 w-3.5" />
          AI相場診断から始める
        </Link>
      </div>

      {/* 安心・導線バー */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-navy-50 px-4 py-2.5 text-xs font-bold text-navy-700">
        <span>✓ 出品手数料無料</span>
        <span>✓ 買取保証つき</span>
        <span>✓ エスクロー決済で安全</span>
        <span>✓ 名義変更まで代行</span>
        <Link href="/listings/valuation" className="ml-auto text-accent-600 hover:underline">
          すぐ現金化したい方は「無料査定（買取）」→
        </Link>
      </div>

      <Suspense>
        <ListingForm userId={user.id} />
      </Suspense>
    </div>
  );
}
