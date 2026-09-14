import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoanApplyForm } from '@/components/LoanApplyForm';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoanApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const listingId = typeof sp.listing === 'string' ? sp.listing : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = listingId ? `/loan/apply?listing=${listingId}` : '/loan/apply';
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }

  let listingTitle: string | undefined;
  let defaultPrice = 0;
  if (listingId) {
    const { data } = await supabase
      .from('listings')
      .select('title, price')
      .eq('id', listingId)
      .maybeSingle();
    if (data) {
      listingTitle = (data as any).title;
      defaultPrice = (data as any).price ?? 0;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-black">ローン仮審査のお申込み</h1>
      <p className="mb-6 text-sm text-slate-500">提携ローン会社による仮審査です。最短即日でご連絡します。</p>
      <LoanApplyForm
        listingId={listingId}
        listingTitle={listingTitle}
        defaultPrice={defaultPrice}
        defaultEmail={user!.email ?? ''}
      />
    </div>
  );
}
