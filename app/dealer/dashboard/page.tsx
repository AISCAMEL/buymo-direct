import Link from 'next/link';
import { Package, Users, TrendingUp, ShieldCheck, Clock } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatYen } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DealerDashboardPage() {
  const { supabase, dealer } = await requireDealer() as any;

  const s = supabase as any;

  const [
    { count: activeCount },
    { count: soldCount },
    { data: escrows },
    { data: dealerInfo },
    { count: staffCount },
  ] = await Promise.all([
    s.from('listings').select('id', { count: 'exact', head: true })
      .eq('dealer_id', dealer.dealerId).eq('status', 'active'),
    s.from('listings').select('id', { count: 'exact', head: true })
      .eq('dealer_id', dealer.dealerId).eq('status', 'sold'),
    s.from('escrow_transactions')
      .select('amount, status')
      .eq('status', 'completed')
      .in('listing_id',
        (await s.from('listings').select('id').eq('dealer_id', dealer.dealerId)).data?.map((l: any) => l.id) ?? []
      ),
    s.from('dealers').select('name, status, commission_rate, approved_at').eq('id', dealer.dealerId).maybeSingle(),
    s.from('dealer_staff').select('id', { count: 'exact', head: true }).eq('dealer_id', dealer.dealerId),
  ]);

  const gmv = (escrows ?? []).reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
  const commission = gmv * ((dealerInfo?.commission_rate ?? 3) / 100);

  const kpis = [
    { icon: Package, label: '公開中在庫', value: String(activeCount ?? 0) + '台', href: '/dealer/listings' },
    { icon: ShieldCheck, label: '成約件数', value: String(soldCount ?? 0) + '台', href: '/dealer/listings?status=sold' },
    { icon: TrendingUp, label: '成約 GMV', value: formatYen(gmv), href: '/dealer/analytics' },
    { icon: TrendingUp, label: '手数料（推計）', value: formatYen(commission), href: '/dealer/analytics' },
    { icon: Users, label: 'スタッフ数', value: String(staffCount ?? 0) + '名', href: '/dealer/staff' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">ダッシュボード</h1>

      {dealerInfo?.status === 'pending' && (
        <div className="card border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-700">
            <Clock className="mr-1.5 inline h-4 w-4" />
            加盟店申込は審査中です
          </p>
          <p className="mt-1 text-sm text-amber-600">本部の承認後、すべての機能が利用可能になります（通常1〜3営業日）。</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className="card p-5 transition hover:shadow-md">
            <Icon className="h-5 w-5 text-navy-400" />
            <p className="mt-2 text-2xl font-black text-navy-700">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-bold">クイックアクション</h2>
          <div className="space-y-2">
            <Link href="/sell" className="btn-accent block text-center text-sm">新規在庫を出品する</Link>
            <Link href="/dashboard/listings/import" className="btn-outline block text-center text-sm">CSV 一括インポート</Link>
            <Link href="/dealer/api-keys" className="btn-outline block text-center text-sm">API キー / Webhook</Link>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">加盟店情報</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">店舗名</dt>
              <dd className="font-bold">{dealerInfo?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">ステータス</dt>
              <dd className={`font-bold ${dealerInfo?.status === 'approved' ? 'text-emerald-600' : dealerInfo?.status === 'suspended' ? 'text-red-500' : 'text-amber-500'}`}>
                {({ pending: '審査中', approved: '承認済み', suspended: '停止中' } as Record<string, string>)[dealerInfo?.status ?? 'pending']}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">成約手数料率</dt>
              <dd className="font-bold">{dealerInfo?.commission_rate}%</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
