import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Banknote, Lock, UserCheck, FileText, Car, ArrowRight, HelpCircle } from 'lucide-react';
import { HowItWorksTabs } from '@/components/HowItWorksTabs';
import { SITE_BASE } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-static';

const BASE = SITE_BASE;

export const metadata: Metadata = {
  title: '初めての方へ｜BUYMO ダイレクトの使い方・安心の仕組み',
  description: 'BUYMO ダイレクトが初めての方へ。買取保証つき・手数料0円・エスクロー決済で安心の中古車ダイレクト売買。売る・買うの流れと安心の仕組みをわかりやすくご案内します。',
  alternates: { canonical: `${BASE}/about` },
};

const VALUES = [
  { icon: ShieldCheck, title: '買取保証つき', desc: '売れなくてもBUYMOが買い取るので安心。すぐ現金化したい方は買取もどうぞ。' },
  { icon: Banknote, title: '出品・掲載は無料', desc: '出品料・掲載料は0円。査定・引取りも無料でご利用いただけます。' },
  { icon: Lock, title: 'エスクローで安心', desc: '代金は第三者が保全。引き渡し・名義変更の完了を確認してから送金されます。' },
];

const SAFETY = [
  { icon: Lock, title: 'エスクロー決済', desc: '第三者が代金を預かり、取引完了まで保全。持ち逃げ・未払いのリスクを抑えます。', href: '/escrow' },
  { icon: UserCheck, title: '本人確認（KYC）', desc: '取引相手の本人確認で、安心して個人間取引ができます。', href: '/dashboard/kyc' },
  { icon: Car, title: '名義変更代行', desc: '書類の回収から手続き完了までBUYMOが代行。遠方・オンライン完結も可能。', href: '/transfer' },
  { icon: FileText, title: '必要書類案内', desc: '売る方・買う方／普通車・軽ごとに必要書類をご案内。様式もダウンロードできます。', href: '/documents/necessary' },
];

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <Breadcrumbs
        items={[
          { name: 'ホーム', url: `${BASE}/` },
          { name: '初めての方へ', url: `${BASE}/about` },
        ]}
      />

      {/* ヒーロー */}
      <section className="rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-12 text-white">
        <span className="mb-2 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取保証つき ダイレクト販売</span>
        <h1 className="text-3xl font-black sm:text-4xl">初めての方へ</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          BUYMO ダイレクトは、<strong>買取保証つき</strong>で安心の中古車ダイレクト（直接）売買プラットフォーム。手数料0円・エスクロー決済で、個人間でも安全に売買できます。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/listings" className="inline-flex items-center gap-1 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-bold hover:bg-white/30">車を探す <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/listings/valuation" className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-black text-[#2E2408] hover:bg-gold-600">無料査定を試す</Link>
        </div>
      </section>

      {/* 3つの価値 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-5">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Icon className="h-6 w-6" />
            </span>
            <p className="font-black text-navy-800">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
          </div>
        ))}
      </section>

      {/* ご利用の流れ */}
      <section className="rounded-2xl bg-navy-700 px-5 py-10 sm:px-8">
        <h2 className="mb-1 text-center text-2xl font-black text-white">ご利用の流れ</h2>
        <p className="mb-8 text-center text-sm text-navy-200">売る・買うのどちらも、かんたん4ステップ。</p>
        <HowItWorksTabs />
      </section>

      {/* 安心の仕組み */}
      <section>
        <h2 className="mb-4 text-2xl font-black text-navy-800">安心の仕組み</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SAFETY.map(({ icon: Icon, title, desc, href }) => (
            <Link key={title} href={href} className="card group flex gap-3 p-5 transition hover:shadow-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-500">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-navy-800 group-hover:text-accent-600">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ 誘導 */}
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-teal-600" />
          <div>
            <p className="font-black text-navy-800">もっと知りたい方へ</p>
            <p className="text-sm text-slate-500">手数料・安全性・名義変更など、よくある質問にまとめています。</p>
          </div>
        </div>
        <Link href="/questions" className="btn-outline inline-flex shrink-0 items-center gap-1">よくある質問を見る <ArrowRight className="h-4 w-4" /></Link>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-gradient-to-r from-navy-700 to-navy-500 p-6 text-center text-white sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">まずは、気軽にはじめてみましょう</h2>
        <p className="mt-1 text-sm text-white/85">査定・ご相談は無料。全国オンラインで完結します。</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-black text-[#2E2408] hover:bg-gold-600">クルマを売る・出品する</Link>
          <Link href="/listings" className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold hover:bg-white/10">クルマを探す</Link>
        </div>
      </section>
    </div>
  );
}
