import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { PlusCircle, ShieldCheck, BarChart2, Upload, Smartphone, Zap, Bell, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen, formatDate } from '@/lib/format';
import { ESCROW_STEPS } from '@/lib/constants';
import { ESCROW_NEXT_ACTION, isMyTurn } from '@/lib/escrow';
import type { EscrowStatus } from '@/lib/types';
import { OwnerListingControls } from '@/components/OwnerListingControls';
import { ExportButton } from '@/components/ExportButton';
import { UpgradeNudge } from '@/components/UpgradeNudge';
import { getViewerAccess } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  active: '公開中',
  reserved: '商談中',
  sold: '売約済み',
  draft: '下書き',
  closed: '取り下げ',
};
const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700',
  sold: 'bg-slate-200 text-slate-600',
  draft: 'bg-slate-100 text-slate-500',
  closed: 'bg-slate-100 text-slate-500',
};

export default async function DashboardListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/listings');

  const { data: listings } = await supabase
    .from('listings')
    .select('*, listing_images(url, sort_order)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  const { data: escrows } = await supabase
    .from('escrow_transactions')
    .select('*, listings(title, maker, model)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const myListings = (listings ?? []) as any[];
  const myEscrows = (escrows ?? []) as any[];
  const access = await getViewerAccess();

  const TERMINAL = ['completed', 'cancelled', 'disputed'];
  const actionNeeded = myEscrows
    .filter((e) => !TERMINAL.includes(e.status))
    .map((e) => {
      const role: 'buyer' | 'seller' = e.buyer_id === user.id ? 'buyer' : 'seller';
      const status = e.status as EscrowStatus;
      return { e, role, status, mine: isMyTurn(status, role), action: ESCROW_NEXT_ACTION[status] };
    });
  const myTurn = actionNeeded.filter((x) => x.mine);

  return (
    <div className="space-y-10">
      {/* 対応待ちの取引（あなたの番） */}
      {myTurn.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-amber-800">
            <Bell className="h-4 w-4" />あなたの対応待ちの取引（{myTurn.length}件）
          </p>
          <ul className="space-y-2">
            {myTurn.map(({ e, role, action }) => (
              <li key={e.id}>
                <Link
                  href={`/escrow/${e.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 transition hover:shadow-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-800">
                      {e.listings?.title ?? (`${e.listings?.maker ?? ''} ${e.listings?.model ?? ''}`.trim() || '取引')}
                    </span>
                    <span className="mt-0.5 block text-xs text-amber-700">
                      {role === 'buyer' ? '買主' : '売主'}として：{action?.label ?? '対応が必要です'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="hidden font-black text-navy-600 sm:inline">{formatYen(e.amount)}</span>
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 無料の業者（プロ）への有料誘致。個人・有料・加盟店・本部には出さない。 */}
      {access.businessTrack && !access.premium && <UpgradeNudge source="dashboard" />}

      {/* 出品 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">出品管理</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/stats" className="btn-outline flex items-center gap-1"><BarChart2 className="h-4 w-4" />アナリティクス</Link>
            <Link href="/dashboard/listings/import" className="btn-outline flex items-center gap-1"><Upload className="h-4 w-4" />一括出品</Link>
            <ExportButton href="/api/export/transactions" label="取引CSV" />
            <Link href="/dashboard/phone" className="btn-outline flex items-center gap-1"><Smartphone className="h-4 w-4" />電話認証</Link>
            <Link href="/dashboard/reviews" className="btn-outline">評価・レビュー</Link>
            <Link href="/dashboard/searches" className="btn-outline">保存した検索</Link>
            <Link href="/dashboard/loans" className="btn-outline">ローン申込</Link>
            <Link href="/dashboard/offers" className="btn-outline">オファー管理</Link>
            <Link href="/dashboard/kyc" className="btn-outline">本人確認</Link>
            <Link href="/dashboard/profile" className="btn-outline">プロフィール設定</Link>
            <Link href="/sell" className="btn-accent"><PlusCircle className="h-4 w-4" /> 新規出品</Link>
          </div>
        </div>

        {myListings.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500">
            出品はまだありません。<Link href="/sell" className="font-bold text-navy-400 hover:underline">最初の1台を出品</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {myListings.map((l) => {
              const cover = l.listing_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url;
              return (
                <li key={l.id} className="card p-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/listings/${l.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {cover && (
                        <Image src={cover} alt="" fill className="object-cover" sizes="64px" />
                      )}
                    </Link>
                    <Link href={`/listings/${l.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-bold hover:underline">{l.title}</p>
                      <p className="text-xs text-slate-500">{l.maker} {l.model} ・ 出品 {formatDate(l.created_at)} ・ {l.view_count} 回閲覧</p>
                    </Link>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-navy-600">{formatYen(l.price)}</p>
                      <span className={`badge ${STATUS_CLASS[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <OwnerListingControls listingId={l.id} status={l.status} compact />
                    </div>
                    {l.status === 'active' && (
                      <Link href={`/dashboard/listings/boost/${l.id}`} className="btn-outline flex items-center gap-1 text-xs text-amber-600 border-amber-300 hover:bg-amber-50">
                        <Zap className="h-3.5 w-3.5" />
                        {l.boosted_until && new Date(l.boosted_until) > new Date() ? 'ブースト中' : 'ブースト'}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 取引 */}
      <section>
        <h2 className="mb-4 text-xl font-black">進行中・完了した取引</h2>
        {myEscrows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">取引はまだありません。</div>
        ) : (
          <ul className="space-y-2">
            {myEscrows.map((tx) => {
              const stepLabel = ESCROW_STEPS.find((s) => s.key === tx.status)?.label
                ?? (tx.status === 'cancelled' ? 'キャンセル' : tx.status === 'disputed' ? '係争中' : tx.status);
              return (
                <li key={tx.id}>
                  <Link href={`/escrow/${tx.id}`} className="card flex items-center justify-between gap-3 p-4 transition hover:shadow-md">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{tx.listings?.title}</p>
                      <p className="text-xs text-slate-500">
                        {tx.buyer_id === user.id ? '購入' : '販売'} ・ {tx.listings?.maker} {tx.listings?.model}
                      </p>
                    </div>
                    <span className="badge shrink-0 bg-navy-50 text-navy-600">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {stepLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
