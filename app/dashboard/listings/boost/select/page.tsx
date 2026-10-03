import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: '出品ブースト | マイページ' };

type Row = { id: string; title: string; maker: string | null; model: string | null; price: number | null; boosted_until: string | null };

export default async function BoostSelectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/listings/boost/select');

  const { data } = await supabase
    .from('listings')
    .select('id, title, maker, model, price, boosted_until')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-black">出品ブースト</h1>
      </div>
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-bold">ブーストする出品を選んでください</p>
        <p className="mt-1">ブースト中は検索結果・トップページで優先表示され、より多くの購入希望者に届きます。</p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          公開中の出品がありません。
          <div className="mt-3"><Link href="/sell" className="btn-accent inline-flex">出品する</Link></div>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => {
            const boosted = l.boosted_until && new Date(l.boosted_until) > new Date();
            return (
              <li key={l.id}>
                <Link href={`/dashboard/listings/boost/${l.id}`} className="card flex items-center justify-between gap-3 p-4 transition hover:border-amber-300 hover:shadow-md">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{l.title}</p>
                    <p className="text-sm text-slate-500">{[l.maker, l.model].filter(Boolean).join(' ')}{l.price ? `　${formatYen(l.price)}` : ''}</p>
                    {boosted && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />ブースト中 〜 {new Date(l.boosted_until!).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-amber-600">
                    {boosted ? '延長する' : 'ブースト'} <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/dashboard/listings" className="block text-center text-sm text-slate-400 hover:underline">← 出品管理に戻る</Link>
    </div>
  );
}
