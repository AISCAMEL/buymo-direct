import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Upload } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatYen, formatDate } from '@/lib/format';
import { OwnerListingControls } from '@/components/OwnerListingControls';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | undefined>>;

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700',
  sold: 'bg-slate-200 text-slate-600',
  draft: 'bg-slate-100 text-slate-500',
  closed: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = {
  active: '公開中', reserved: '商談中', sold: '売約済み', draft: '下書き', closed: '取り下げ',
};

export default async function DealerListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase, dealer } = await requireDealer() as any;

  const statusFilter = sp.status ?? 'active';
  let query = (supabase as any)
    .from('listings')
    .select('*, listing_images(url, sort_order)')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') query = query.eq('status', statusFilter);

  const { data: listings } = await query;
  const rows = (listings ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">在庫管理</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/listings/import" className="btn-outline flex items-center gap-1 text-sm">
            <Upload className="h-4 w-4" /> CSV 一括
          </Link>
          <Link href="/sell" className="btn-accent flex items-center gap-1 text-sm">
            <PlusCircle className="h-4 w-4" /> 新規出品
          </Link>
        </div>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'reserved', 'sold', 'draft', 'closed'].map((s) => (
          <Link key={s} href={`/dealer/listings${s === 'all' ? '' : `?status=${s}`}`}
            className={`rounded-full px-3 py-1 text-sm font-bold border transition ${statusFilter === s ? 'bg-navy-600 text-white border-navy-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {s === 'all' ? 'すべて' : STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          在庫がありません。<Link href="/sell" className="font-bold text-navy-400 hover:underline">最初の1台を出品</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => {
            const cover = l.listing_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url;
            return (
              <li key={l.id} className="card p-3">
                <div className="flex items-center gap-4">
                  <Link href={`/listings/${l.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {cover && <Image src={cover} alt="" fill className="object-cover" sizes="64px" />}
                  </Link>
                  <Link href={`/listings/${l.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-bold hover:underline">{l.title}</p>
                    <p className="text-xs text-slate-500">{l.maker} {l.model} ・ {formatDate(l.created_at)} ・ {l.view_count ?? 0} 回閲覧</p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="font-black text-navy-600">{formatYen(l.price)}</p>
                    <span className={`badge ${STATUS_CLASS[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <OwnerListingControls listingId={l.id} status={l.status} compact />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
