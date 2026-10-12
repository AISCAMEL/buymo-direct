import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, MapPin, Building2, Search, BadgePercent } from 'lucide-react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { SKILL_LABEL, skillLabel } from '@/lib/cases';
import { SKILL_CATEGORY, skillCategory } from '@/lib/matching-fee';
import { getPricingConfig } from '@/lib/settings';
import { skillContent } from '@/lib/skill-content';

export const dynamic = 'force-dynamic';

type Params = Promise<{ key: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params;
  if (!SKILL_LABEL[key]) return { title: 'サービス | BUYMO ダイレクト' };
  const name = SKILL_LABEL[key];
  return {
    title: `${name}を依頼できるプロ・相場 | BUYMO ダイレクト`,
    description: `${name}（${SKILL_CATEGORY[key] ?? 'その他'}）を BUYMO 加盟のプロに直接依頼。${skillContent(key).blurb}`,
  };
}

export default async function SkillDetailPage({ params }: { params: Params }) {
  const { key } = await params;
  if (!SKILL_LABEL[key]) notFound();

  const name = SKILL_LABEL[key];
  const category = skillCategory(key);
  const content = skillContent(key);
  const cfg = await getPricingConfig();
  const rate = cfg.matchingFeeRateByCategory?.[category] ?? cfg.matchingFeeDefaultRate;

  const supabase = await createClient();

  // このスキルを提供する加盟店
  let partnerRows: { dealer_id: string; price_from: number | null; area: string | null; note: string | null }[] = [];
  try {
    const { data } = await supabase
      .from('partner_skills')
      .select('dealer_id, price_from, area, note')
      .eq('skill_key', key)
      .eq('active', true);
    partnerRows = (data ?? []) as typeof partnerRows;
  } catch { partnerRows = []; }

  const dealerIds = Array.from(new Set(partnerRows.map((p) => p.dealer_id)));
  let dealers: { id: string; name: string; company_name: string | null; prefecture: string | null; logo_url: string | null }[] = [];
  if (dealerIds.length > 0) {
    try {
      const { data } = await supabase
        .from('dealers')
        .select('id, name, company_name, prefecture, logo_url')
        .eq('status', 'approved')
        .in('id', dealerIds);
      dealers = (data ?? []) as typeof dealers;
    } catch { dealers = []; }
  }

  const priceByDealer = new Map<string, number | null>();
  for (const p of partnerRows) {
    const cur = priceByDealer.get(p.dealer_id);
    if (p.price_from != null && (cur == null || p.price_from < cur)) priceByDealer.set(p.dealer_id, p.price_from);
    else if (!priceByDealer.has(p.dealer_id)) priceByDealer.set(p.dealer_id, p.price_from);
  }
  const prices = partnerRows.map((p) => p.price_from).filter((n): n is number => n != null);
  const minPrice = prices.length ? Math.min(...prices) : null;

  // 関連サービス（同カテゴリ）
  const related = Object.keys(SKILL_LABEL).filter((k) => k !== key && (SKILL_CATEGORY[k] ?? 'その他') === category).slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2">
      <Link href="/skills" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> サービス一覧
      </Link>

      {/* ヘッダー */}
      <div className="card p-6">
        <span className="badge bg-navy-50 text-navy-700">{category}</span>
        <h1 className="mt-2 text-3xl font-black text-navy-800">{name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{content.blurb}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-[11px] text-slate-400">相場の目安</p>
            <p className="text-lg font-black text-accent-600">{minPrice != null ? `${formatYen(minPrice)}〜` : '要見積り'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-[11px] text-slate-400">対応プロ</p>
            <p className="text-lg font-black text-navy-800">{dealers.length}店</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><BadgePercent className="h-3 w-3" />成約手数料</p>
            <p className="text-lg font-black text-navy-800">{Math.round(rate * 100)}%</p>
          </div>
        </div>
        {content.priceNote && <p className="mt-2 text-xs text-slate-400">{content.priceNote}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dealers?skill=${key}`} className="btn-accent"><Search className="h-4 w-4" /> このサービスで探す</Link>
          <Link href="/join" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">プロ登録（無料）</Link>
        </div>
      </div>

      {/* 含まれること */}
      <div className="card p-5">
        <h2 className="mb-2 font-black text-navy-800">このサービスでできること</h2>
        <ul className="space-y-1.5 text-sm text-slate-700">
          {content.points.map((p) => (
            <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{p}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">成約時のみ手数料が発生します（{category}：{Math.round(rate * 100)}%・最低 {formatYen(cfg.matchingFeeMinFee)}／税抜）。見積りの確認後に依頼できます。</p>
      </div>

      {/* 対応プロ一覧 */}
      <div className="card p-5">
        <h2 className="mb-3 font-black text-navy-800">{name}に対応しているプロ</h2>
        {dealers.length === 0 ? (
          <p className="text-sm text-slate-400">現在このサービスに対応しているプロはいません。「車のプロを探す」から他のサービスもご覧いただけます。</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {dealers.map((d) => {
              const pf = priceByDealer.get(d.id);
              return (
                <Link key={d.id} href={`/dealers/${d.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:shadow-sm">
                  {d.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.logo_url} alt={d.name} className="h-10 w-10 shrink-0 rounded-lg object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-100"><Building2 className="h-5 w-5 text-navy-400" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy-800">{d.name}</p>
                    <p className="flex items-center gap-2 text-xs text-slate-400">
                      {d.prefecture && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{d.prefecture}</span>}
                      <span className="font-bold text-accent-600">{pf != null ? `${formatYen(pf)}〜` : '要見積り'}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 関連サービス */}
      {related.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-black text-navy-800">関連するサービス（{category}）</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((k) => (
              <Link key={k} href={`/skills/${k}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200">{skillLabel(k)}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
