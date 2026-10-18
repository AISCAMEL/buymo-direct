import Link from 'next/link';
import { ArrowRight, Wrench, SprayCan, Cable, Truck, BadgeJapaneseYen, Stamp, Car, Recycle, LifeBuoy, PaintBucket, Sparkles } from 'lucide-react';
import { RECRUIT_GENRES } from '@/lib/recruit-genres';
import { RecruitSalesLetter } from '@/components/RecruitSalesLetter';

export const dynamic = 'force-static';
export const metadata = {
  title: '車のプロ募集｜ジャンル別の加盟案内',
  description: '整備・板金・コーティング・電装・陸送・行政書士・レンタカー・解体など、車に関わるプロを募集。無料登録で受注・集客でき、かかるのは成約手数料だけ。',
};

const ICON: Record<string, typeof Wrench> = {
  maintenance: Wrench,
  bodywork: PaintBucket,
  coating: SprayCan,
  electrical: Cable,
  appraisal: BadgeJapaneseYen,
  transport: Truck,
  gyosei: Stamp,
  rental: Car,
  dismantle: Recycle,
  roadservice: LifeBuoy,
};

export default function RecruitIndexPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 py-4">
      {/* ヒーロー */}
      <section className="rounded-3xl bg-navy-700 px-6 py-12 text-center text-white">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5" /> 加盟店・プロ募集
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">車に関わる仕事で、<br className="sm:hidden" />受注を増やす。</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-navy-100">
          整備・板金・コーティング・電装・陸送から、行政書士・レンタカー・解体まで。<br className="hidden sm:block" />
          BUYMO に無料登録すると、全国のお客様から直接ご依頼が届きます。かかるのは<strong className="text-white">成約したときの手数料だけ</strong>。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/join" className="rounded-lg bg-gold-500 px-6 py-3 text-sm font-black text-navy-900 hover:bg-gold-400">無料で登録する</Link>
          <a href="#genres" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">ジャンルを見る</a>
        </div>
      </section>

      {/* 3つの約束 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { t: '登録・掲載は無料', d: '初期費用・掲載料は0円。成約時のみ手数料。' },
          { t: '集客はおまかせ', d: '広告・問い合わせ対応はBUYMOが代行。' },
          { t: '自分のペースで', d: '受ける案件・日程はあなたが選べます。' },
        ].map((x) => (
          <div key={x.t} className="card p-5 text-center">
            <p className="font-black text-navy-800">{x.t}</p>
            <p className="mt-1 text-sm text-slate-500">{x.d}</p>
          </div>
        ))}
      </section>

      {/* セールスレター（PASONA） */}
      <RecruitSalesLetter genreName="あなたの仕事" joinHref="/join?source=recruit_top" />

      {/* ジャンル一覧 */}
      <section id="genres" className="scroll-mt-20 space-y-4">
        <h2 className="text-center text-2xl font-black text-navy-800">あなたの仕事のジャンルを選ぶ</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECRUIT_GENRES.map((g) => {
            const Icon = ICON[g.key] ?? Wrench;
            return (
              <Link key={g.key} href={`/recruit/${g.key}`} className="card group flex flex-col p-5 transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-600"><Icon className="h-5 w-5" /></span>
                  {g.isNew && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-black text-accent-600">NEW</span>}
                </div>
                <p className="mt-3 text-lg font-black text-navy-800">{g.name}</p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{g.short}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent-600">
                  募集ページを見る <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="card bg-navy-50/60 p-8 text-center">
        <h2 className="text-xl font-black text-navy-800">まずは無料で登録してみませんか？</h2>
        <p className="mt-1 text-sm text-slate-600">ジャンルが一覧にない場合も、「その他」で登録・ご相談いただけます。</p>
        <Link href="/join" className="btn-accent mt-4 inline-flex">無料で登録する</Link>
      </section>
    </div>
  );
}
