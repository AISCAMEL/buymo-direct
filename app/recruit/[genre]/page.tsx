import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Check, Users, BadgeJapaneseYen, UserPlus, ClipboardCheck, Handshake, Wallet, HelpCircle } from 'lucide-react';
import { skillLabel } from '@/lib/cases';
import { faqPageJsonLd } from '@/lib/seo';
import { RecruitSalesLetter } from '@/components/RecruitSalesLetter';
import {
  RECRUIT_GENRES, getRecruitGenre, DEFAULT_RECRUIT_FLOW, COMMON_BENEFITS,
} from '@/lib/recruit-genres';

export const dynamic = 'force-static';

type Params = Promise<{ genre: string }>;

export function generateStaticParams() {
  return RECRUIT_GENRES.map((g) => ({ genre: g.key }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { genre } = await params;
  const g = getRecruitGenre(genre);
  if (!g) return { title: '加盟募集 | BUYMO ダイレクト' };
  return {
    title: `${g.name}の加盟募集｜BUYMOで受注する | BUYMO ダイレクト`,
    description: g.intro,
  };
}

const FLOW_ICON = [UserPlus, ClipboardCheck, Handshake, Wallet];

export default async function RecruitGenrePage({ params }: { params: Params }) {
  const { genre } = await params;
  const g = getRecruitGenre(genre);
  if (!g) notFound();

  const flow = g.flow ?? DEFAULT_RECRUIT_FLOW;
  const benefits = [...g.benefits, ...COMMON_BENEFITS];
  const joinHref = `/join?source=recruit_${g.key}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(g.faqs)) }} />

      <Link href="/recruit" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> プロ募集トップ
      </Link>

      {/* ヒーロー */}
      <section className="rounded-3xl bg-navy-700 px-6 py-10 text-white">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{g.name}</span>
          {g.isNew && <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-black text-navy-900">NEW</span>}
        </div>
        <p className="mt-4 text-sm font-bold text-navy-100">{g.heroLead}</p>
        <h1 className="mt-1 whitespace-pre-line text-3xl font-black leading-tight">{g.heroTitle}</h1>
        <p className="mt-4 text-sm leading-relaxed text-navy-100">{g.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={joinHref} className="rounded-lg bg-gold-500 px-6 py-3 text-sm font-black text-navy-900 hover:bg-gold-400">無料で登録する</Link>
          <a href="#flow" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">始め方を見る</a>
        </div>
      </section>

      {/* セールスレター（PASONA） */}
      <RecruitSalesLetter genreName={g.name} joinHref={joinHref} />

      {/* こんな方へ */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-black text-navy-800"><Users className="h-5 w-5 text-navy-500" /> こんな方におすすめ</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          {g.forWhom.map((w) => (
            <li key={w} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{w}</li>
          ))}
        </ul>
      </section>

      {/* メリット */}
      <section className="space-y-3">
        <h2 className="text-center text-xl font-black text-navy-800">BUYMOで受注するメリット</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="card p-5">
              <p className="font-black text-navy-800">{b.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{b.desc}</p>
            </div>
          ))}
        </div>
        {g.earn && (
          <p className="flex items-start gap-1.5 rounded-xl bg-accent-50/60 p-3 text-xs font-bold text-accent-700">
            <BadgeJapaneseYen className="mt-0.5 h-4 w-4 shrink-0" />{g.earn}
          </p>
        )}
      </section>

      {/* 加盟の流れ */}
      <section id="flow" className="scroll-mt-20 space-y-3">
        <h2 className="text-center text-xl font-black text-navy-800">登録から受注までの流れ</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {flow.map((s, i) => {
            const Icon = FLOW_ICON[i] ?? UserPlus;
            return (
              <li key={s.title} className="card relative p-4 text-center">
                <span className="absolute left-3 top-3 text-xs font-black text-slate-300">{i + 1}</span>
                <Icon className="mx-auto mb-1.5 h-6 w-6 text-navy-500" />
                <p className="text-sm font-black text-navy-800">{s.title}</p>
                <p className="mt-1 text-xs leading-snug text-slate-500">{s.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="flex items-center justify-center gap-2 text-xl font-black text-navy-800"><HelpCircle className="h-5 w-5 text-navy-500" /> よくある質問</h2>
        <div className="space-y-2">
          {g.faqs.map((f) => (
            <details key={f.q} className="card group p-4">
              <summary className="cursor-pointer list-none font-bold text-slate-800 marker:hidden">
                <span className="text-accent-600">Q. </span>{f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 関連サービス */}
      {g.relatedSkills.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-2 font-black text-navy-800">関連サービス（お客様向け）</h2>
          <div className="flex flex-wrap gap-2">
            {g.relatedSkills.map((k) => (
              <Link key={k} href={`/skills/${k}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200">{skillLabel(k)}</Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="card bg-navy-50/60 p-8 text-center">
        <h2 className="text-xl font-black text-navy-800">まずは無料で登録</h2>
        <p className="mt-1 text-sm text-slate-600">費用はかかりません。登録後、担当より流れをご案内します。</p>
        <Link href={joinHref} className="btn-accent mt-4 inline-flex">無料で登録する</Link>
      </section>
    </div>
  );
}
