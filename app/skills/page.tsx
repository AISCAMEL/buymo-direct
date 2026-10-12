import Link from 'next/link';
import { Wrench, SprayCan, Cable, Truck, BadgeJapaneseYen, Users, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SKILL_LABEL } from '@/lib/cases';
import { SKILL_CATEGORY } from '@/lib/matching-fee';
import { skillContent } from '@/lib/skill-content';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'サービス一覧（車のプロに依頼できること）| BUYMO ダイレクト',
  description: '査定・買取・整備・車検・板金・塗装・コーティング・電装・陸送・名義変更・廃車まで。BUYMO 加盟のプロに直接依頼できるサービスの一覧と相場・手数料。',
};

const CATEGORY_ORDER = ['査定・買取', '整備・修理', '美装', '電装・取付', '物流・手続き', 'その他'];
const CATEGORY_ICON: Record<string, typeof Wrench> = {
  '査定・買取': BadgeJapaneseYen,
  '整備・修理': Wrench,
  '美装': SprayCan,
  '電装・取付': Cable,
  '物流・手続き': Truck,
  'その他': Wrench,
};

export default async function SkillsIndexPage() {
  const supabase = await createClient();

  // 提供プロ数（スキル別）
  const countByKey: Record<string, number> = {};
  try {
    const { data: ps } = await supabase.from('partner_skills').select('skill_key').eq('active', true);
    for (const row of (ps ?? []) as { skill_key: string }[]) {
      countByKey[row.skill_key] = (countByKey[row.skill_key] ?? 0) + 1;
    }
  } catch { /* noop */ }

  // 表示対象のスキル（コードのマスタを正とする）
  const keys = Object.keys(SKILL_LABEL);
  const byCategory: Record<string, string[]> = {};
  for (const k of keys) {
    const c = SKILL_CATEGORY[k] ?? 'その他';
    (byCategory[c] ??= []).push(k);
  }
  const categories = CATEGORY_ORDER.filter((c) => byCategory[c]?.length);

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      <div className="text-center">
        <h1 className="text-3xl font-black leading-tight">車のプロに依頼できること</h1>
        <p className="mt-2 text-sm text-slate-600">
          査定・買取から整備・板金・コーティング・電装・陸送・手続きまで。<br className="hidden sm:block" />
          BUYMO 加盟のプロに<strong>直接依頼</strong>できます。各サービスの相場・手数料・対応プロはこちら。
        </p>
      </div>

      {categories.map((c) => {
        const Icon = CATEGORY_ICON[c] ?? Wrench;
        return (
          <section key={c} className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-black text-navy-800"><Icon className="h-5 w-5 text-navy-500" /> {c}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byCategory[c].map((k) => {
                const n = countByKey[k] ?? 0;
                return (
                  <Link key={k} href={`/skills/${k}`} className="card group flex flex-col p-4 transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-navy-800">{SKILL_LABEL[k]}</p>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-accent-500" />
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">{skillContent(k).blurb}</p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-400">
                      <Users className="h-3 w-3" /> 対応プロ {n}店
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="card bg-navy-50/50 p-6 text-center">
        <p className="font-black text-navy-800">自分のスキルで受注しませんか？</p>
        <p className="mt-1 text-sm text-slate-600">整備・板金・コーティング・電装など、プロとして無料で登録・受注できます。</p>
        <Link href="/join" className="btn-accent mt-3 inline-flex">プロ登録（無料）へ</Link>
      </div>
    </div>
  );
}
