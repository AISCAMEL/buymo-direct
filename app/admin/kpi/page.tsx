import { Target, Users, Store, Wallet, Car, Package, Wrench, Star, TrendingUp, Repeat } from 'lucide-react';
import KpiCard from '@/components/KpiCard';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'KPI（1億円目標）| 管理' };

// 単価・手数料の前提（成長計画と一致。変更時はここを更新）
const MEMBER_PRICE = 2980;      // 有料会員 月額
const DEALER_PRICE = 9800;      // 買取加盟 月額
const PARTS_FEE_RATE = 0.08;    // パーツAU 手数料率
const TARGET = 100_000_000;     // 年商1億円

const man = (yen: number) => `${Math.round(yen / 10000).toLocaleString('ja-JP')}万円`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default async function AdminKpiPage() {
  const supabase = await createClient();
  const s = supabase as any;

  const [escrowRes, profilesRes, dealersRes, partsRes, casesRes, reviewsRes, listingsRes] = await Promise.all([
    s.from('escrow_transactions').select('status, amount, escrow_fee, seller_fee, loan_fee, title_fee, installment_fee, created_at'),
    s.from('profiles').select('created_at, member_tier'),
    s.from('dealers').select('status, service_style, created_at'),
    s.from('part_auctions').select('status, current_price, winner_id, closed_at, created_at'),
    s.from('cases').select('status, created_at'),
    s.from('reviews').select('rating'),
    s.from('listings').select('status'),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const inMonth = (iso?: string | null) => !!iso && new Date(iso) >= monthStart;
  const in30 = (iso?: string | null) => !!iso && new Date(iso) >= d30;

  // 直近6ヶ月のキー
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const emptyByMonth = () => Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;

  // ── フロー：成約（エスクロー） ─────────────────────────────
  const escrows = (escrowRes.data ?? []) as any[];
  const feeOf = (e: any) => (e.escrow_fee ?? 0) + (e.seller_fee ?? 0) + (e.loan_fee ?? 0) + (e.title_fee ?? 0) + (e.installment_fee ?? 0);
  const completed = escrows.filter((e) => e.status === 'completed');
  const gmvTotal = completed.reduce((a, e) => a + (e.amount ?? 0), 0);
  const feeTotal = completed.reduce((a, e) => a + feeOf(e), 0);
  const monthCompleted = completed.filter((e) => inMonth(e.created_at));
  const gmvMonth = monthCompleted.reduce((a, e) => a + (e.amount ?? 0), 0);
  const feeMonth = monthCompleted.reduce((a, e) => a + feeOf(e), 0);
  const fee30 = completed.filter((e) => in30(e.created_at)).reduce((a, e) => a + feeOf(e), 0);
  const avgDeal = monthCompleted.length ? Math.round(gmvMonth / monthCompleted.length) : (completed.length ? Math.round(gmvTotal / completed.length) : 0);
  const gmvByMonth = emptyByMonth();
  for (const e of completed) { const k = monthKey(new Date(e.created_at)); if (k in gmvByMonth) gmvByMonth[k] += e.amount ?? 0; }

  // ── ストック：会員・加盟店 ─────────────────────────────────
  const profiles = (profilesRes.data ?? []) as { created_at: string; member_tier?: string | null }[];
  const totalUsers = profiles.length;
  const paidMembers = profiles.filter((p) => p.member_tier === 'paid').length;
  const newUsersMonth = profiles.filter((p) => inMonth(p.created_at)).length;
  const newByMonth = emptyByMonth();
  for (const p of profiles) { const k = monthKey(new Date(p.created_at)); if (k in newByMonth) newByMonth[k] += 1; }

  const dealers = (dealersRes.data ?? []) as { status: string; service_style?: string | null }[];
  const approvedDealers = dealers.filter((d) => d.status === 'approved').length;
  const pendingDealers = dealers.filter((d) => d.status === 'pending').length;
  const mobileDealers = dealers.filter((d) => d.status === 'approved' && (d.service_style === 'mobile' || d.service_style === 'both')).length;

  const mrr = paidMembers * MEMBER_PRICE + approvedDealers * DEALER_PRICE;
  const arrStock = mrr * 12;

  // ── パーツオークション ─────────────────────────────────────
  const parts = (partsRes.data ?? []) as any[];
  const won = parts.filter((p) => p.winner_id);
  const partsGmvMonth = won.filter((p) => inMonth(p.closed_at ?? p.created_at)).reduce((a, p) => a + (p.current_price ?? 0), 0);
  const partsWonMonth = won.filter((p) => inMonth(p.closed_at ?? p.created_at)).length;
  const partsFee30 = won.filter((p) => in30(p.closed_at ?? p.created_at)).reduce((a, p) => a + (p.current_price ?? 0), 0) * PARTS_FEE_RATE;
  const activeParts = parts.filter((p) => p.status === 'active').length;

  // ── 作業マッチング（案件） ─────────────────────────────────
  const cases = (casesRes.data ?? []) as { status: string; created_at: string }[];
  const casesDone = cases.filter((c) => c.status === 'completed' || c.status === 'paid');
  const casesDoneMonth = casesDone.filter((c) => inMonth(c.created_at)).length;

  // ── 信頼・供給 ─────────────────────────────────────────────
  const reviews = (reviewsRes.data ?? []) as { rating: number }[];
  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const listings = (listingsRes.data ?? []) as { status: string }[];
  const activeListings = listings.filter((l) => l.status === 'active').length;

  // ── 年間ラン・レート（1億円への現在地） ───────────────────
  const flowAnnual = (fee30 + partsFee30) * 12;      // 直近30日の手数料を年換算
  const runRate = arrStock + flowAnnual;
  const pct = Math.min(100, (runRate / TARGET) * 100);

  const hasData = totalUsers > 0 || completed.length > 0 || approvedDealers > 0;
  const maxGmv = Math.max(1, ...months.map((m) => gmvByMonth[m]));
  const maxNew = Math.max(1, ...months.map((m) => newByMonth[m]));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-navy-700"><Target className="h-6 w-6 text-accent-500" />KPI ダッシュボード（年商1億円目標）</h1>
        <p className="mt-1 text-sm text-slate-500">成長計画の6収益源に沿った計測。継続課金（ストック）と取引手数料（フロー）の積み上げを見える化します。</p>
      </div>

      {!hasData && (
        <div className="card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          まだ実データが少ないため、数値は 0 中心です。取引・会員・加盟店が増えると自動で反映されます（デモ確認は「デモデータ」から）。
        </div>
      )}

      {/* 1億円への現在地 */}
      <section className="rounded-2xl bg-gradient-to-br from-navy-700 to-navy-600 p-6 text-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-navy-100">推定 年間ラン・レート</p>
            <p className="text-3xl font-black tabular-nums sm:text-4xl">{man(runRate)}<span className="ml-1 text-base font-bold text-navy-100">/ 年</span></p>
          </div>
          <p className="text-lg font-black" style={{ color: pct >= 100 ? '#86efac' : '#ffd98a' }}>目標達成 {pct.toFixed(1)}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-accent-400 to-gold-400" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-navy-100">
          <span>目標ライン：1億円 / 年</span>
          <span>ストック（会員・加盟）年換算：<b className="text-white">{man(arrStock)}</b></span>
          <span>フロー（手数料）年換算：<b className="text-white">{man(flowAnnual)}</b></span>
        </div>
      </section>

      {/* ストック（継続課金） */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-800">ストック（継続課金）— 最重要</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="有料会員数" value={`${paidMembers.toLocaleString('ja-JP')}名`} icon={Users} color="#0C3A44" />
          <KpiCard title="買取加盟店（承認済）" value={`${approvedDealers.toLocaleString('ja-JP')}店`} icon={Store} color="#0F766E" />
          <KpiCard title="推定 MRR（月次継続課金）" value={formatYen(mrr)} icon={Repeat} color="#D4AF65" />
          <KpiCard title="推定 ARR（年次）" value={man(arrStock)} icon={TrendingUp} color="#14B8A6" />
        </div>
        <p className="text-xs text-slate-400">前提：有料会員 {MEMBER_PRICE.toLocaleString('ja-JP')}円/月、加盟店 {DEALER_PRICE.toLocaleString('ja-JP')}円/月。申請中の加盟 {pendingDealers} 店。</p>
      </section>

      {/* フロー（取引手数料） */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-800">フロー（取引・今月）</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="今月の成約GMV" value={man(gmvMonth)} icon={Wallet} color="#0F766E" />
          <KpiCard title="今月の成約件数" value={`${monthCompleted.length.toLocaleString('ja-JP')}件`} icon={Car} color="#0C3A44" />
          <KpiCard title="平均成約額" value={avgDeal ? formatYen(avgDeal) : '—'} icon={TrendingUp} color="#D4AF65" />
          <KpiCard title="今月の手数料収入" value={man(feeMonth)} icon={Wallet} color="#14B8A6" />
          <KpiCard title="パーツ落札（今月）" value={`${partsWonMonth.toLocaleString('ja-JP')}件`} icon={Package} color="#0F766E" />
          <KpiCard title="パーツ流通額（今月）" value={man(partsGmvMonth)} icon={Package} color="#0C3A44" />
          <KpiCard title="作業マッチング成約（今月）" value={`${casesDoneMonth.toLocaleString('ja-JP')}件`} icon={Wrench} color="#D4AF65" />
          <KpiCard title="手数料収入（累計）" value={man(feeTotal)} icon={Wallet} color="#14B8A6" />
        </div>
      </section>

      {/* 供給・信頼 */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-800">供給・信頼</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="登録ユーザー（累計）" value={`${totalUsers.toLocaleString('ja-JP')}名`} icon={Users} color="#0C3A44" />
          <KpiCard title="公開中の在庫" value={`${activeListings.toLocaleString('ja-JP')}台`} icon={Car} color="#0F766E" />
          <KpiCard title="出張対応プロ" value={`${mobileDealers.toLocaleString('ja-JP')}店`} icon={Store} color="#D4AF65" />
          <KpiCard title="平均口コミ評価" value={reviews.length ? `★${avgRating.toFixed(2)}` : '—'} change={undefined} icon={Star} color="#14B8A6" />
          <KpiCard title="出品中パーツ" value={`${activeParts.toLocaleString('ja-JP')}件`} icon={Package} color="#0F766E" />
        </div>
      </section>

      {/* 月次トレンド */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-black text-slate-700">月次 成約GMV（直近6ヶ月）</h3>
          <ul className="space-y-2">
            {months.map((m) => (
              <li key={m} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-slate-400">{m.slice(5)}月</span>
                <span className="flex h-4 flex-1 items-center">
                  <span className="h-2.5 rounded bg-navy-500" style={{ width: `${Math.max(3, (gmvByMonth[m] / maxGmv) * 100)}%` }} />
                  <span className="ml-2 font-bold tabular-nums text-slate-600">{man(gmvByMonth[m])}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-black text-slate-700">月次 新規ユーザー（直近6ヶ月）</h3>
          <ul className="space-y-2">
            {months.map((m) => (
              <li key={m} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-slate-400">{m.slice(5)}月</span>
                <span className="flex h-4 flex-1 items-center">
                  <span className="h-2.5 rounded bg-accent-500" style={{ width: `${Math.max(3, (newByMonth[m] / maxNew) * 100)}%` }} />
                  <span className="ml-2 font-bold tabular-nums text-slate-600">{newByMonth[m].toLocaleString('ja-JP')}名</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">今月の新規：{newUsersMonth.toLocaleString('ja-JP')}名</p>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        ラン・レートは「直近30日の手数料収入 ×12 ＋ 継続課金 ARR」で推計。手数料率・単価の前提はこのページ上部の定数で管理しています。
      </p>
    </div>
  );
}
