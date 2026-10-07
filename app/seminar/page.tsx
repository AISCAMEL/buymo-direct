import Image from 'next/image';
import { TrendingUp, ShieldCheck, Users, PlayCircle } from 'lucide-react';
import { JoinLeadForm } from '@/components/JoinLeadForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: '無料オンラインセミナー | 車の買取で稼ぐ',
  description: '未経験からでも。車の買取ビジネスの始め方・稼ぎ方を無料オンラインセミナーで。',
};

export default function SeminarPage() {
  // PASONA：Problem→Agitation→Solution→Narrow→Action
  const problems = [
    '給料は上がらないのに、物価は上がっていく',
    '副業・独立したいが、何から始めればいいか分からない',
    '車は好き。でも「買取で稼げる」なんて本当？',
  ];
  const solutions = [
    { icon: TrendingUp, t: '1台で数万〜数十万の利益', d: '相場と仕入れの型を学べば、在庫を持たずに利益を狙えます。' },
    { icon: ShieldCheck, t: '未経験でも安心の仕組み', d: '査定・名義変更・エスクローまでBUYMOがサポート。' },
    { icon: Users, t: 'ひとりにしない', d: '買取コミュニティと運営の伴走で、初心者もつまずきません。' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Problem / Agitation */}
      <section className="text-center">
        <div className="relative mb-5 overflow-hidden rounded-2xl">
          <Image src="/hero-seminar.jpg" alt="" width={1200} height={480} className="h-40 w-full object-cover sm:h-48" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-xs font-black text-navy-600">
          <PlayCircle className="h-3.5 w-3.5" /> 無料オンラインセミナー
        </span>
        <h1 className="mt-3 text-3xl font-black leading-tight">
          車の買取で、<span className="text-gold-600">もう一つの収入を。</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          「車は好きだけど、買取で稼ぐなんてイメージできない」——そんな方へ。<br />
          仕入れゼロ・在庫リスクを抑えて始める、車の買取ビジネスの<strong>全体像と始め方</strong>を、
          60分の無料オンラインセミナーでお伝えします。
        </p>
      </section>

      <section className="card p-6">
        <p className="font-black text-slate-800">こんな方へ</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          {problems.map((p) => (
            <li key={p} className="flex gap-2"><span className="mt-0.5 shrink-0 text-slate-300">✓</span>{p}</li>
          ))}
        </ul>
      </section>

      {/* Solution */}
      <section className="space-y-3">
        {solutions.map((s) => (
          <div key={s.t} className="card flex items-start gap-3 p-5">
            <s.icon className="mt-0.5 h-6 w-6 shrink-0 text-gold-600" />
            <div>
              <p className="font-black text-slate-800">{s.t}</p>
              <p className="text-sm text-slate-500">{s.d}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Narrow + Action */}
      <section className="space-y-3">
        <div className="rounded-2xl bg-navy-500 p-6 text-center text-white">
          <p className="text-lg font-black">参加費無料・オンライン・顔出し不要</p>
          <p className="mt-1 text-sm text-white/80">まずは気軽に、全体像だけでも。無理な勧誘はありません。</p>
        </div>
        <h2 className="pt-2 text-center text-xl font-black">セミナーに申し込む</h2>
        <JoinLeadForm source="seminar" />
      </section>
    </div>
  );
}
