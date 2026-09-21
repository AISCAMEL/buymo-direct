import Link from 'next/link';
import { ShieldCheck, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { formatYen } from '@/lib/format';
import { BuybackReviewButton, type AdminBuybackRow } from './BuybackReview';

export const dynamic = 'force-dynamic';

type Status = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';

const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { label: '申請受付中', cls: 'text-amber-700 bg-amber-50',    icon: Clock },
  in_review: { label: '審査中',    cls: 'text-navy-700 bg-navy-50',      icon: Eye },
  approved:  { label: '承認済み',  cls: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
  rejected:  { label: '不承認',    cls: 'text-red-700 bg-red-50',        icon: XCircle },
  completed: { label: '買取完了',  cls: 'text-slate-600 bg-slate-100',   icon: CheckCircle2 },
};

const FILTERS: (Status | 'all')[] = ['all', 'pending', 'in_review', 'approved', 'rejected', 'completed'];

export default async function AdminBuybackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = (FILTERS.includes(sp.status as Status) ? sp.status : 'all') as Status | 'all';

  const service = createServiceClient();
  let tableMissing = false;
  let rows: AdminBuybackRow[] = [];
  let counts = { pending: 0, in_review: 0, approved: 0 };

  try {
    const { data, error } = await service
      .from('buyback_requests')
      .select('id, seller_id, maker, model, year, mileage_km, ai_price_min, ai_price_max, buyback_price, status, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) tableMissing = true;

    const reqs = data ?? [];
    // 出品者名を取得
    const sellerIds = [...new Set(reqs.map((r) => r.seller_id).filter(Boolean))];
    const nameMap = new Map<string, string>();
    if (sellerIds.length > 0) {
      const { data: profs } = await service
        .from('profiles')
        .select('id, display_name')
        .in('id', sellerIds);
      (profs ?? []).forEach((p) => nameMap.set(p.id, p.display_name));
    }

    rows = reqs.map((r) => ({
      id: r.id,
      maker: r.maker,
      model: r.model,
      year: r.year,
      mileage_km: r.mileage_km,
      ai_price_min: r.ai_price_min,
      ai_price_max: r.ai_price_max,
      buyback_price: r.buyback_price,
      status: r.status,
      seller_name: (r.seller_id && nameMap.get(r.seller_id)) || '（不明）',
      created_at: r.created_at,
    }));

    counts = {
      pending: rows.filter((r) => r.status === 'pending').length,
      in_review: rows.filter((r) => r.status === 'in_review').length,
      approved: rows.filter((r) => r.status === 'approved').length,
    };
  } catch {
    tableMissing = true;
  }

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-emerald-500" />
        <h1 className="text-2xl font-black">買取保証管理</h1>
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">buyback_requests テーブルが見つからないか未適用です。</p>
          <p className="mt-1">Supabase SQL エディタで <code>supabase/migrations/20240701_buymo_features.sql</code> を実行してください。</p>
        </div>
      )}

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '申請受付中', count: counts.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: '審査中', count: counts.in_review, color: 'text-navy-700', bg: 'bg-navy-50' },
          { label: '承認済み', count: counts.approved, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-4 text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? '/admin/buyback' : `/admin/buyback?status=${f}`}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              filter === f ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'すべて' : STATUS_CONFIG[f]?.label ?? f}
          </Link>
        ))}
      </div>

      {/* テーブル */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              {['車両', '出品者', '保証買取価格', 'AI査定', 'ステータス', '申請日', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const st = STATUS_CONFIG[r.status as Status] ?? STATUS_CONFIG.pending;
              const Icon = st.icon;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy-800 whitespace-nowrap">{r.maker} {r.model}</p>
                    <p className="text-xs text-slate-400">{r.year}年 / {r.mileage_km.toLocaleString()}km</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.seller_name}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">{formatYen(r.buyback_price)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatYen(r.ai_price_min)}〜{formatYen(r.ai_price_max)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>
                      <Icon className="h-3 w-3" />{st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {r.status !== 'rejected' && r.status !== 'completed' && (
                      <BuybackReviewButton row={r} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">該当する申請はありません</div>
        )}
      </div>
    </div>
  );
}
