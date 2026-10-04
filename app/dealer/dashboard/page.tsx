import Link from 'next/link';
import { Package, Users, TrendingUp, ShieldCheck, Clock, FileText, Receipt } from 'lucide-react';
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
    { data: quoteRows },
    { data: invoiceRows },
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
    s.from('quotes').select('status').eq('dealer_id', dealer.dealerId),
    s.from('invoices').select('status, total, paid_amount').eq('dealer_id', dealer.dealerId),
  ]);

  const gmv = (escrows ?? []).reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
  const commission = gmv * ((dealerInfo?.commission_rate ?? 3) / 100);

  const quotes = (quoteRows ?? []) as { status: string }[];
  const invoices = (invoiceRows ?? []) as { status: string; total: number; paid_amount: number }[];
  const quoteOpen = quotes.filter((q) => ['draft', 'sent', 'accepted'].includes(q.status)).length;
  const invoiceOpen = invoices.filter((v) => ['issued', 'sent', 'awaiting_payment', 'partially_paid'].includes(v.status)).length;
  const outstanding = invoices
    .filter((v) => v.status !== 'cancelled')
    .reduce((sum, v) => sum + Math.max(0, (v.total ?? 0) - (v.paid_amount ?? 0)), 0);

  // オークション サマリー（今月）。新テーブル未作成でも落ちないようガード。
  let auc = { listed: 0, settled: 0, due: 0 };
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [{ count: listedCount }, { data: settRows }] = await Promise.all([
      s.from('auction_listings').select('id', { count: 'exact', head: true }).eq('dealer_id', dealer.dealerId).gte('created_at', monthStart.toISOString()),
      s.from('auction_settlements').select('total_due').eq('dealer_id', dealer.dealerId).gte('created_at', monthStart.toISOString()),
    ]);
    const setts = (settRows ?? []) as { total_due: number }[];
    auc = { listed: listedCount ?? 0, settled: setts.length, due: setts.reduce((sum, r) => sum + (r.total_due ?? 0), 0) };
  } catch { /* オークション未導入時は無視 */ }

  const kpis = [
    { icon: Package, label: '公開中在庫', value: String(activeCount ?? 0) + '台', href: '/dealer/listings' },
    { icon: FileText, label: '進行中の見積', value: String(quoteOpen), href: '/dealer/quotes' },
    { icon: Receipt, label: '進行中の請求', value: String(invoiceOpen), href: '/dealer/invoices' },
    { icon: Receipt, label: '未回収額', value: formatYen(outstanding), href: '/dealer/invoices' },
    { icon: ShieldCheck, label: '成約件数', value: String(soldCount ?? 0) + '台', href: '/dealer/listings?status=sold' },
    { icon: TrendingUp, label: '成約 GMV', value: formatYen(gmv), href: '/dealer/analytics' },
    { icon: TrendingUp, label: '手数料（推計）', value: formatYen(commission), href: '/dealer/analytics' },
    { icon: Users, label: 'スタッフ数', value: String(staffCount ?? 0) + '名', href: '/dealer/staff' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">ダッシュボード</h1>

      <div className="flex items-start gap-3 rounded-2xl border border-navy-200 bg-navy-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
        <p className="text-sm text-slate-700">
          <span className="font-black text-slate-800">ダイレクト販売（B2C）</span>：貴店の在庫を全国の購入希望者へ販売できます。問い合わせ → 見積 → 請求 → 入金 → 成約までBUYMO内で管理できます。
        </p>
      </div>

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

      {/* 今月のオークション */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold"><TrendingUp className="h-5 w-5 text-navy-500" />今月のオークション</h2>
          <Link href="/dealer/auctions" className="text-sm font-bold text-navy-600 hover:underline">管理する →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xl font-black text-navy-700 sm:text-2xl">{auc.listed}</p><p className="text-xs text-slate-500">出品（今月）</p></div>
          <div><p className="text-xl font-black text-navy-700 sm:text-2xl">{auc.settled}</p><p className="text-xs text-slate-500">決算済み</p></div>
          <div><p className="text-xl font-black text-navy-700 sm:text-2xl">{formatYen(auc.due)}</p><p className="text-xs text-slate-500">本部支払い見込み</p></div>
        </div>
        <p className="mt-2 text-xs text-slate-400">出品料＋成約手数料（利益×料率）の合計見込みです。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-bold">クイックアクション</h2>
          <div className="space-y-2">
            <Link href="/sell" className="btn-accent block text-center text-sm">新規在庫を出品する</Link>
            <Link href="/dealer/auctions/new" className="btn-outline block text-center text-sm">オークションに出品する</Link>
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
