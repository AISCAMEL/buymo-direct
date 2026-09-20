import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { Calculator, Inbox, Banknote } from 'lucide-react';
import { formatYen } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  maker: string;
  model: string | null;
  year: number;
  mileage_km: number;
  condition: string;
  price_low: number;
  price_high: number;
  price_est: number;
  source: string;
  user_id: string | null;
  created_at: string;
};

const COND_LABEL: Record<string, string> = { excellent: '優良', good: '良好', fair: '普通' };

export default async function AdminValuationsPage() {
  await requireAdmin();

  let rows: Row[] = [];
  let tableMissing = false;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('valuations')
      .select('id, maker, model, year, mileage_km, condition, price_low, price_high, price_est, source, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) tableMissing = true;
    rows = (data ?? []) as Row[];
  } catch {
    tableMissing = true;
  }

  const total = rows.length;
  const leads = rows.filter((r) => r.user_id).length; // 会員による査定＝識別可能なリード
  const avgEst = total ? Math.round(rows.reduce((s, r) => s + (r.price_est ?? 0), 0) / total) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">査定履歴</h1>
        <span className="ml-1 text-sm text-slate-400">（無料査定・AI相場診断のリード）</span>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-navy-700">{total.toLocaleString('ja-JP')}</p>
          <p className="text-xs font-bold text-slate-500">査定回数（累計）</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-gold-600">{leads.toLocaleString('ja-JP')}</p>
          <p className="text-xs font-bold text-slate-500">会員リード（識別可）</p>
        </div>
        <div className="card p-4 text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-black text-accent-600"><Banknote className="h-5 w-5" />{formatYen(avgEst)}</p>
          <p className="text-xs font-bold text-slate-500">平均査定額</p>
        </div>
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">valuations テーブルが見つかりません。</p>
          <p className="mt-1">
            Supabase SQL エディタで <code>supabase/migrations/20240721_valuations.sql</code> を実行すると、査定履歴がここに記録・表示されます。
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">査定履歴はまだありません。</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">日時</th>
                <th className="px-4 py-3 text-left font-bold">車両</th>
                <th className="px-4 py-3 text-right font-bold">走行</th>
                <th className="px-4 py-3 text-center font-bold">状態</th>
                <th className="px-4 py-3 text-right font-bold">査定レンジ</th>
                <th className="px-4 py-3 text-center font-bold">方式</th>
                <th className="px-4 py-3 text-center font-bold">会員</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString('ja-JP')}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    {r.maker}{r.model ? ` ${r.model}` : ''} <span className="font-normal text-slate-400">{r.year}年</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.mileage_km.toLocaleString('ja-JP')}km</td>
                  <td className="px-4 py-3 text-center text-slate-600">{COND_LABEL[r.condition] ?? r.condition}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-navy-700">{formatYen(r.price_low)}〜{formatYen(r.price_high)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.source === 'ai' ? 'bg-accent-50 text-accent-600' : 'bg-slate-100 text-slate-500'}`}>
                      {r.source === 'ai' ? 'AI' : '相場'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.user_id ? <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-600">会員</span> : <span className="text-xs text-slate-400">未ログイン</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
