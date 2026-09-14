import { redirect } from 'next/navigation';
import { Zap, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { boostListing } from '../actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const PLANS = [
  { key: '3days', days: 3, label: '3日間ブースト', price: 500, desc: '週末の集中露出に最適' },
  { key: '7days', days: 7, label: '7日間ブースト', price: 1000, desc: 'より多くのユーザーに届ける' },
  { key: '30days', days: 30, label: '30日間ブースト', price: 2500, desc: '長期間の優先表示で確実に売る', badge: 'お得' },
];

export default async function BoostPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/listings/boost/${id}`);

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, maker, model, seller_id, boosted_until, status')
    .eq('id', id)
    .maybeSingle();
  if (!listing || listing.seller_id !== user.id) redirect('/dashboard/listings');
  if (listing.status !== 'active') redirect('/dashboard/listings');

  const isCurrentlyBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-black">出品ブースト</h1>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-500">対象出品</p>
        <p className="font-bold">{listing.title}</p>
        <p className="text-sm text-slate-500">{listing.maker} {listing.model}</p>
        {isCurrentlyBoosted && (
          <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            ブースト中 〜 {new Date(listing.boosted_until!).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-bold">ブーストとは？</p>
        <p className="mt-1">ブースト中の出品は検索結果・トップページで優先表示されます。より多くの購入希望者に届き、成約までの時間を短縮します。</p>
        <p className="mt-1 text-xs text-amber-600">※ デモ環境のため決済は発生しません。</p>
      </div>

      <div className="space-y-3">
        {PLANS.map((plan) => {
          const boostAction = boostListing.bind(null, id, plan.key);
          return (
            <form action={boostAction} key={plan.key}>
              <button
                className="card w-full p-5 text-left transition hover:shadow-md hover:border-amber-300 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-navy-700">{plan.label}</span>
                    {plan.badge && (
                      <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{plan.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black text-amber-600">{formatYen(plan.price)}</p>
                  <p className="text-xs text-slate-400">{plan.days}日間</p>
                </div>
              </button>
            </form>
          );
        })}
      </div>

      <a href="/dashboard/listings" className="block text-center text-sm text-slate-400 hover:underline">
        ← 出品管理に戻る
      </a>
    </div>
  );
}
