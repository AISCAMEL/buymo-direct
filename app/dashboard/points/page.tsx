import { redirect } from 'next/navigation';
import { Gift, Star, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { ExportButton } from '@/components/ExportButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ポイント・会員ランク | BUYMO' };

const RANKS = [
  { id: 'bronze', label: 'ブロンズ', min: 0, max: 999, color: 'text-amber-700 bg-amber-100', bar: 'bg-amber-500' },
  { id: 'silver', label: 'シルバー', min: 1000, max: 4999, color: 'text-slate-600 bg-slate-200', bar: 'bg-slate-500' },
  { id: 'gold', label: 'ゴールド', min: 5000, max: 19999, color: 'text-yellow-700 bg-yellow-100', bar: 'bg-yellow-500' },
  { id: 'platinum', label: 'プラチナ', min: 20000, max: Infinity, color: 'text-gold-600 bg-gold-100', bar: 'bg-gold-500' },
];

const RANK_BENEFITS: Record<string, string[]> = {
  bronze: ['エスクロー取引でポイント付与', '基本サービス利用可'],
  silver: ['成約手数料 0.2%OFF', '優先カスタマーサポート', 'ブースト割引 5%'],
  gold: ['成約手数料 0.5%OFF', '専任サポート担当', 'ブースト割引 10%', '無料査定年2回'],
  platinum: ['成約手数料 1.0%OFF', '24時間専任サポート', 'ブースト無料（月1回）', '無料査定無制限', '優先掲載'],
};

const EARN_GUIDE = [
  { action: '出品完了', points: '50pt' },
  { action: '成約完了（買主）', points: '購入額の 0.5%' },
  { action: '成約完了（売主）', points: '販売額の 0.3%' },
  { action: 'レビュー投稿', points: '20pt' },
  { action: '本人確認（KYC）完了', points: '100pt' },
  { action: '電話番号認証', points: '50pt' },
  { action: '友達紹介', points: '200pt' },
];

const USE_GUIDE = [
  { usage: '500pt → ¥500クーポン', rate: '1pt = 1円' },
  { usage: 'ブースト（3日）¥980 → 980pt', rate: '直接割引' },
  { usage: '陸送手配 500pt割引', rate: '—' },
];

export default async function PointsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/points');

  const { data: pointsRow } = await (supabase as any)
    .from('user_points')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const points = pointsRow?.points ?? 0;
  const rank = RANKS.find(r => points >= r.min && points <= r.max) ?? RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  const progress = nextRank
    ? Math.round(((points - rank.min) / (nextRank.min - rank.min)) * 100)
    : 100;

  const { data: history } = await (supabase as any)
    .from('point_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const REASON_LABEL: Record<string, string> = {
    escrow_completed: '取引完了ボーナス',
    listing_sold: '成約ポイント',
    review_given: 'レビュー投稿',
    kyc_verified: '本人確認完了',
    phone_verified: '電話番号認証',
    referral: '友達紹介',
    coupon_use: 'クーポン使用',
    boost_use: 'ブースト使用',
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-navy-400" />
          <h1 className="text-2xl font-black">ポイント・会員ランク</h1>
        </div>
        <ExportButton href="/api/export/points" label="ポイント履歴CSV" />
      </div>

      {/* Rank card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-navy-700 to-navy-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-black ${rank.color}`}>{rank.label}会員</span>
              <p className="mt-3 text-4xl font-black">{points.toLocaleString()}<span className="text-xl font-normal"> pt</span></p>
              <p className="mt-1 text-sm text-white/70">保有ポイント</p>
            </div>
            <Star className="h-16 w-16 text-white/20" />
          </div>
        </div>
        <div className="p-5">
          {nextRank ? (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">次のランク: <strong>{nextRank.label}</strong></span>
                <span className="font-bold text-navy-700">{(nextRank.min - points).toLocaleString()}pt 必要</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${rank.bar}`} style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{rank.label} {rank.min.toLocaleString()}pt 〜 / ゴール: {nextRank.min.toLocaleString()}pt</p>
            </>
          ) : (
            <p className="text-center font-black text-gold-600">最高ランク達成！ありがとうございます。</p>
          )}
        </div>
      </div>

      {/* Rank benefits */}
      <div className="card p-5">
        <h2 className="mb-3 font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 現在の特典</h2>
        <ul className="space-y-1.5">
          {(RANK_BENEFITS[rank.id] ?? []).map(b => (
            <li key={b} className="flex items-center gap-2 text-sm">
              <span className="text-emerald-500">✓</span> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Earn / Use guide */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-bold">ポイントの貯め方</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {EARN_GUIDE.map(g => (
                <tr key={g.action}>
                  <td className="py-1.5 text-slate-600">{g.action}</td>
                  <td className="py-1.5 text-right font-bold text-emerald-600">+{g.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">ポイントの使い方</h2>
          <div className="space-y-2">
            {USE_GUIDE.map(g => (
              <div key={g.usage} className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-bold text-navy-800">{g.usage}</p>
                {g.rate !== '—' && <p className="text-xs text-slate-400">{g.rate}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {(history ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold">ポイント履歴</h2>
          <div className="card divide-y divide-slate-100">
            {(history ?? []).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-bold">{REASON_LABEL[tx.reason] ?? tx.reason}</p>
                  <p className="text-xs text-slate-400">{tx.created_at?.slice(0, 10)}</p>
                </div>
                <span className={`font-black text-base ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}pt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(history ?? []).length === 0 && points === 0 && (
        <p className="text-center text-sm text-slate-400 py-4">まだポイント履歴がありません。取引・出品・認証でポイントが貯まります。</p>
      )}
    </div>
  );
}
