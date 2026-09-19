import Link from 'next/link';
import { Users, Car, ShieldCheck, Landmark, Star, Wallet, Flag, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';

export const dynamic = 'force-dynamic';

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-navy-600">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  // 管理者は is_admin() ポリシーで横断的に閲覧可能
  const [{ count: userCount }, listingsRes, escrowRes, loansRes, reviewsRes, reportsRes, buybackRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('status'),
    supabase.from('escrow_transactions').select('status, amount, escrow_fee, title_fee, installment_fee'),
    supabase.from('loan_applications').select('status'),
    supabase.from('reviews').select('rating'),
    supabase.from('reports').select('status'),
    supabase.from('buyback_requests').select('status, buyback_price'),
  ]);

  const listings = (listingsRes.data ?? []) as { status: string }[];
  const byStatus = (s: string) => listings.filter((l) => l.status === s).length;

  const escrows = (escrowRes.data ?? []) as any[];
  const completed = escrows.filter((e) => e.status === 'completed');
  const gmv = completed.reduce((s, e) => s + (e.amount ?? 0), 0);
  const feeRevenue = completed.reduce((s, e) => s + (e.escrow_fee ?? 0) + (e.title_fee ?? 0) + (e.installment_fee ?? 0), 0);
  const activeEscrow = escrows.filter((e) => !['completed', 'cancelled'].includes(e.status)).length;
  const disputed = escrows.filter((e) => e.status === 'disputed').length;

  const loans = (loansRes.data ?? []) as { status: string }[];
  const pendingLoans = loans.filter((l) => l.status === 'submitted' || l.status === 'reviewing').length;

  const reviews = (reviewsRes.data ?? []) as { rating: number }[];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const reports = (reportsRes.data ?? []) as { status: string }[];
  const openReports = reports.filter((r) => r.status === 'open').length;

  const buybacks = (buybackRes.data ?? []) as { status: string; buyback_price: number }[];
  const buybackPending = buybacks.filter((b) => b.status === 'pending' || b.status === 'in_review').length;
  const buybackCompleted = buybacks.filter((b) => b.status === 'completed');
  const buybackGmv = buybackCompleted.reduce((s, b) => s + (b.buyback_price ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={Users} label="登録ユーザー" value={`${userCount ?? 0}`} />
        <KpiCard icon={Car} label="出品（公開中）" value={`${byStatus('active')}`} sub={`商談中 ${byStatus('reserved')} / 売約 ${byStatus('sold')}`} />
        <KpiCard icon={Wallet} label="成約GMV" value={formatYen(gmv)} sub={`成約 ${completed.length} 件`} />
        <KpiCard icon={ShieldCheck} label="手数料売上" value={formatYen(feeRevenue)} sub="エスクロー+名義+分割" />
        <KpiCard icon={ShieldCheck} label="進行中の取引" value={`${activeEscrow}`} sub={disputed ? `係争 ${disputed} 件` : '係争なし'} />
        <KpiCard icon={Star} label="平均評価" value={reviews.length ? avgRating.toFixed(2) : '—'} sub={`${reviews.length} 件`} />
        <KpiCard icon={Banknote} label="買取実績（GMV）" value={formatYen(buybackGmv)} sub={`買取完了 ${buybackCompleted.length} 件`} />
        <KpiCard icon={Banknote} label="買取 審査待ち" value={`${buybackPending}`} sub="申請受付・審査中" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/loans" className="card flex items-center justify-between p-5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-navy-400" />
            <span className="font-bold">未処理のローン審査</span>
          </div>
          <span className="badge bg-amber-100 text-amber-700">{pendingLoans} 件</span>
        </Link>
        <Link href="/admin/escrow" className="card flex items-center justify-between p-5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-navy-400" />
            <span className="font-bold">係争中の取引</span>
          </div>
          <span className={`badge ${disputed ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{disputed} 件</span>
        </Link>
        <Link href="/admin/reports" className="card flex items-center justify-between p-5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-navy-400" />
            <span className="font-bold">未対応の通報</span>
          </div>
          <span className={`badge ${openReports ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{openReports} 件</span>
        </Link>
        <Link href="/admin/buyback" className="card flex items-center justify-between p-5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-navy-400" />
            <span className="font-bold">買取保証の審査待ち</span>
          </div>
          <span className={`badge ${buybackPending ? 'bg-gold-100 text-gold-600' : 'bg-slate-200 text-slate-600'}`}>{buybackPending} 件</span>
        </Link>
      </div>
    </div>
  );
}
