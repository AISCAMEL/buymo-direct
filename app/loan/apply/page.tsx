import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/settings';
import { LoanApplyForm } from '@/components/LoanApplyForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'マイカーローン審査申込',
  description: '中古車購入のマイカーローンをオンラインで申込。月々のお支払いシミュレーションにも対応しています。',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoanApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const listingId = typeof sp.listing === 'string' ? sp.listing : undefined;
  const numParam = (v: unknown) => (typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : undefined);
  const prefill = {
    down: numParam(sp.down),
    term: numParam(sp.term),
    apr: numParam(sp.apr),
    garage: sp.garage === '1' ? true : sp.garage === '0' ? false : undefined,
    warrantyFee: numParam(sp.wfee),
    warrantyLabel: typeof sp.wlabel === 'string' ? sp.wlabel : undefined,
    transportFee: numParam(sp.tfee),
    fromSim: sp.down !== undefined || sp.term !== undefined,
  };

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
  let vehicle: { year?: number; mileageKm?: number; maker?: string; bodyType?: string } = {};
  if (listingId) {
    const { data } = await supabase
      .from('listings')
      .select('title, price, year, mileage_km, maker, body_type')
      .eq('id', listingId)
      .maybeSingle();
    if (data) {
      const d = data as any;
      listingTitle = d.title;
      defaultPrice = d.price ?? 0;
      vehicle = { year: d.year, mileageKm: d.mileage_km, maker: d.maker, bodyType: d.body_type };
    }
  }

  const pricing = await getPricingConfig();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-black">ローン仮審査のお申込み</h1>
      <p className="mb-6 text-sm text-slate-500">提携ローン会社による仮審査です。最短即日でご連絡します。</p>
      <LoanApplyForm
        listingId={listingId}
        listingTitle={listingTitle}
        defaultPrice={defaultPrice}
        defaultEmail={user!.email ?? ''}
        vehicle={vehicle}
        pricing={pricing}
        prefill={prefill}
      />
    </div>
  );
}
