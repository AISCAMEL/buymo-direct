import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { adminSetListingStatus, adminDeleteListing } from '@/app/admin/actions';
import type { Listing } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LABEL: Record<string, string> = {
  active: '公開中', reserved: '商談中', sold: '売約', draft: '下書き', closed: '非公開',
};

export default async function AdminListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('listings')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  const listings = (data ?? []) as (Listing & { profiles?: { display_name: string } })[];

  return (
    <div>
      <h1 className="mb-4 text-xl font-black">出品モデレーション（{listings.length}）</h1>
      <ul className="space-y-2">
        {listings.map((l) => (
          <li key={l.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/listings/${l.id}`} className="font-bold hover:underline">{l.title}</Link>
                <p className="text-sm text-slate-600">
                  {l.maker} {l.model} ・ {formatYen(l.price)} ・ 出品者 {l.profiles?.display_name ?? '—'}
                </p>
                <p className="text-xs text-slate-400">{l.view_count} 回閲覧 ・ {formatDate(l.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="badge bg-slate-100 text-slate-600">{LABEL[l.status] ?? l.status}</span>
                <div className="flex gap-1">
                  {l.status !== 'closed' ? (
                    <form action={adminSetListingStatus.bind(null, l.id, 'closed')}>
                      <button className="rounded-md border border-amber-300 px-2 py-1 text-xs font-bold text-amber-700">非公開にする</button>
                    </form>
                  ) : (
                    <form action={adminSetListingStatus.bind(null, l.id, 'active')}>
                      <button className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-700">公開に戻す</button>
                    </form>
                  )}
                  <form action={adminDeleteListing.bind(null, l.id)}>
                    <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700">削除</button>
                  </form>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
