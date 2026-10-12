import Link from 'next/link';
import { Building2, MapPin, Package, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { skillCategory } from '@/lib/matching-fee';
import { skillLabel } from '@/lib/cases';
import { StarRating } from '@/components/StarRating';

export const dynamic = 'force-dynamic';
export const metadata = { title: '加盟店一覧 | BUYMO' };

export default async function DealersPage({
  searchParams,
}: {
  searchParams: Promise<{ prefecture?: string; skill?: string; category?: string }>;
}) {
  const { prefecture, skill, category } = await searchParams;
  const supabase = await createClient();
  const s = supabase as any;

  // スキルマスタ（絞り込みチップ用）
  const { data: skillMaster } = await s.from('skills').select('key, name, category, sort').order('sort', { ascending: true });
  const allSkills = (skillMaster ?? []) as { key: string; name: string; category: string | null; sort: number }[];
  const categories = Array.from(new Set(allSkills.map((sk) => sk.category).filter(Boolean))) as string[];

  // 絞り込み対象のスキルキー（個別スキル優先、なければ選択ジャンル内の全スキル）
  let targetSkillKeys: string[] | null = null;
  if (skill) targetSkillKeys = [skill];
  else if (category) targetSkillKeys = allSkills.filter((sk) => sk.category === category).map((sk) => sk.key);

  // 該当スキルを提供する加盟店IDを取得
  let skillDealerIds: string[] | null = null;
  if (targetSkillKeys) {
    const { data: ps } = await s
      .from('partner_skills')
      .select('dealer_id')
      .in('skill_key', targetSkillKeys.length ? targetSkillKeys : ['__none__'])
      .eq('active', true);
    skillDealerIds = Array.from(new Set((ps ?? []).map((r: any) => r.dealer_id)));
  }

  const chipCls = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-bold ${on ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;
  const prefQ = (extra: Record<string, string>) => {
    const qp = new URLSearchParams();
    if (prefecture) qp.set('prefecture', prefecture);
    for (const [k, v] of Object.entries(extra)) qp.set(k, v);
    const str = qp.toString();
    return str ? `/dealers?${str}` : '/dealers';
  };

  let query = s
    .from('dealers')
    .select('id, owner_id, name, company_name, prefecture, description, logo_url, rep_name, rep_photo_url, rep_message, service_area')
    .eq('status', 'approved')
    .order('name', { ascending: true });

  if (prefecture) query = query.eq('prefecture', prefecture);
  if (skillDealerIds) query = query.in('id', skillDealerIds.length ? skillDealerIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: dealers } = await query;

  // listing counts per dealer
  const { data: counts } = await s
    .from('listings')
    .select('dealer_id')
    .eq('status', 'active')
    .in('dealer_id', (dealers ?? []).map((d: any) => d.id));

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.dealer_id] = (countMap[row.dealer_id] ?? 0) + 1;
  }

  // 各加盟店の提供サービス（ジャンル）バッジ用
  const { data: dealerSkillRows } = await s
    .from('partner_skills')
    .select('dealer_id, skill_key')
    .eq('active', true)
    .in('dealer_id', (dealers ?? []).map((d: any) => d.id));
  const catMap: Record<string, string[]> = {};
  const skillNameMap: Record<string, string[]> = {};
  for (const row of (dealerSkillRows ?? []) as { dealer_id: string; skill_key: string }[]) {
    const c = skillCategory(row.skill_key);
    const arr = (catMap[row.dealer_id] ??= []);
    if (!arr.includes(c)) arr.push(c);
    const names = (skillNameMap[row.dealer_id] ??= []);
    const label = skillLabel(row.skill_key);
    if (!names.includes(label)) names.push(label);
  }

  // 口コミ（レビュー）集計：reviewee_id = 加盟店オーナーのプロフィールID
  const ownerIds = Array.from(new Set((dealers ?? []).map((d: any) => d.owner_id).filter(Boolean)));
  const { data: reviewRows } = ownerIds.length
    ? await s.from('reviews').select('reviewee_id, rating').in('reviewee_id', ownerIds)
    : { data: [] };
  const ratingAgg: Record<string, { sum: number; count: number }> = {};
  for (const r of (reviewRows ?? []) as { reviewee_id: string; rating: number }[]) {
    const a = (ratingAgg[r.reviewee_id] ??= { sum: 0, count: 0 });
    a.sum += r.rating;
    a.count += 1;
  }

  // prefecture options
  const prefectureList = Array.from(new Set((dealers ?? []).map((d: any) => d.prefecture).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-navy-500" />
        <div>
          <h1 className="text-2xl font-black">車のプロを探す</h1>
          <p className="text-sm text-slate-500">顔・自己紹介・できること・口コミで選べます。BUYMO 認定のプロに購入も依頼も。</p>
          <Link href="/skills" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline">サービス（スキル）一覧から探す →</Link>
        </div>
      </div>

      {/* Category filter（ジャンル大分類） */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-slate-400">サービスのジャンルで探す</p>
        <div className="flex flex-wrap gap-2">
          <a href={prefQ({})} className={chipCls(!category && !skill)}>すべて</a>
          {categories.map((c) => (
            <a key={c} href={prefQ({ category: c })} className={chipCls(category === c)}>{c}</a>
          ))}
        </div>
      </div>

      {/* Skill filter（選択ジャンルの詳細サービス） */}
      {(category || skill) && (
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-400">詳細サービス</p>
          <div className="flex flex-wrap gap-2">
            {allSkills
              .filter((sk) => !category || sk.category === category)
              .map((sk) => (
                <a key={sk.key} href={prefQ({ skill: sk.key })} className={chipCls(skill === sk.key)}>{sk.name}</a>
              ))}
          </div>
        </div>
      )}

      {/* Prefecture filter */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/dealers"
          className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${!prefecture ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          すべて
        </a>
        {prefectureList.map((p) => (
          <a
            key={p}
            href={`/dealers?prefecture=${encodeURIComponent(p)}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${prefecture === p ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {p}
          </a>
        ))}
      </div>

      {(!dealers || dealers.length === 0) && (
        <p className="py-16 text-center text-slate-400">現在登録されている加盟店はありません</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(dealers ?? []).map((d: any) => {
          const face = d.rep_photo_url || d.logo_url || null;
          const intro = d.rep_message || d.description || null;
          const skills = (skillNameMap[d.id] ?? []) as string[];
          const agg = ratingAgg[d.owner_id];
          return (
          <Link
            key={d.id}
            href={`/dealers/${d.id}`}
            className="card flex flex-col gap-3 p-5 transition hover:shadow-md"
          >
            {/* 顔写真＋名前 */}
            <div className="flex items-center gap-3">
              {face ? (
                <img src={face} alt={d.rep_name || d.name} className="h-14 w-14 shrink-0 rounded-full border border-slate-100 object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-100 text-2xl">🧑‍🔧</div>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-black text-navy-800">{d.name}</h2>
                {d.rep_name && <p className="truncate text-xs text-slate-500">担当：{d.rep_name}</p>}
                {!d.rep_name && d.company_name && <p className="truncate text-xs text-slate-500">{d.company_name}</p>}
                {agg ? (
                  <div className="mt-0.5"><StarRating value={agg.sum / agg.count} count={agg.count} /></div>
                ) : (
                  <p className="mt-0.5 text-[11px] text-slate-300">口コミはこれから</p>
                )}
              </div>
            </div>

            {/* 自己紹介 */}
            {intro && <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{intro}</p>}

            {/* できること（対応サービス） */}
            {skills.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-400"><Wrench className="h-3 w-3" />できること</p>
                <div className="flex flex-wrap gap-1">
                  {skills.slice(0, 5).map((name) => (
                    <span key={name} className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-600">{name}</span>
                  ))}
                  {skills.length > 5 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">+{skills.length - 5}</span>}
                </div>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              {(d.service_area || d.prefecture) && (
                <span className="flex items-center gap-1 truncate text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {d.service_area || d.prefecture}
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1 font-bold text-navy-600">
                <Package className="h-3.5 w-3.5" />
                {countMap[d.id] ?? 0}台
              </span>
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
