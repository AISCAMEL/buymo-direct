import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Lock, HandCoins, CheckCircle2, UserCheck, FileCheck2, Headphones } from 'lucide-react';

export const revalidate = 3600;
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export const metadata: Metadata = {
  title: 'エスクロー決済とは｜安心の個人間・ダイレクト取引｜BUYMO ダイレクト',
  description: 'BUYMO ダイレクトのエスクロー決済は、代金を第三者が一時お預かりし、車両の受け渡しと名義変更が完了してから売主へ送金する仕組み。「お金を払ったのに車が来ない」「車を渡したのに入金されない」を防ぎます。',
  alternates: { canonical: `${BASE}/escrow` },
};

const STEPS = [
  { n: '1', title: '買主が代金をお預け', desc: '購入代金をBUYMO（第三者）が一時お預かり。この時点では売主にはまだ送金されません。', icon: Lock },
  { n: '2', title: '車両の引き渡し・確認', desc: '車両の受け渡しと、名義変更（移転登録）の手続きを進めます。買主が車両を確認します。', icon: FileCheck2 },
  { n: '3', title: '完了後に売主へ送金', desc: '受け渡し・名義変更の完了を確認してから、お預かりした代金を売主へお支払いします。', icon: HandCoins },
];

const SAFEGUARDS = [
  { title: '本人確認（KYC）', desc: '売主・買主の本人確認を実施。なりすまし・架空取引を防ぎます。', icon: UserCheck },
  { title: '車台番号の確認', desc: '車台番号（VIN）を確認し、車両の実在・同一性をチェックします。', icon: FileCheck2 },
  { title: 'トラブル時のサポート', desc: '受け渡し・入金でお困りの際は運営があいだに入り、解決をサポートします。', icon: Headphones },
];

const FAQ = [
  { q: 'エスクロー決済は必ず使わないといけませんか？', a: 'BUYMO ダイレクトの取引では、代金の受け渡しをエスクローで安全に行うことを基本としています。現金の直接手渡しによるトラブルを避けられます。' },
  { q: 'いつ売主にお金が入りますか？', a: '車両の引き渡しと名義変更（移転登録）の完了を確認してから、売主へお支払いします。' },
  { q: '手数料はかかりますか？', a: '取引形態により手数料が異なります（自分で交渉する「ダイレクト販売」は3%、BUYMOが代行する場合は7%）。詳しくは出品・購入の各画面でご確認ください。' },
  { q: 'キャンセルはできますか？', a: '受け渡し前で双方の合意がある場合など、状況に応じて対応します。お預かりした代金は条件に従って返金されます。' },
];

export default function EscrowPage() {
  return (
    <div className="space-y-12">
      {/* ヒーロー */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 to-navy-500 px-6 py-12 text-white">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mint-200"><ShieldCheck className="h-4 w-4" />安心の決済</p>
        <h1 className="text-3xl font-black sm:text-4xl">エスクロー決済で、はじめての個人間取引も安心</h1>
        <p className="mt-3 max-w-2xl text-white/85">
          代金を第三者（BUYMO）が一時お預かりし、<strong className="font-bold text-white">車両の受け渡しと名義変更が完了してから</strong>売主へ送金する仕組みです。
          「お金を払ったのに車が来ない」「車を渡したのに入金されない」を防ぎます。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/listings" className="btn-accent px-6">車を探す</Link>
          <Link href="/sell" className="rounded-xl border border-white/40 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">出品する</Link>
        </div>
      </section>

      {/* 仕組み3ステップ */}
      <section>
        <h2 className="mb-1 text-xl font-black text-navy-800">エスクロー決済の流れ</h2>
        <p className="mb-6 text-sm text-slate-500">お金の動きを「見える化」して、双方が安心して取引できます。</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="card relative p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-500 text-sm font-black text-white">{s.n}</span>
                  <Icon className="h-5 w-5 text-navy-500" />
                </div>
                <h3 className="font-black text-navy-800">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 安心の仕組み */}
      <section>
        <h2 className="mb-6 text-xl font-black text-navy-800">安心を支える3つの仕組み</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SAFEGUARDS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <Icon className="mb-2 h-6 w-6 text-accent-600" />
                <h3 className="font-bold text-navy-800">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 比較 */}
      <section className="rounded-2xl bg-slate-50 p-6">
        <h2 className="mb-4 text-lg font-black text-navy-800">直接現金取引との違い</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-red-100 bg-white p-4">
            <p className="font-bold text-red-600">直接現金でのやり取り</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>・入金・受け渡しのタイミングで不安が残る</li>
              <li>・トラブル時は当事者同士で解決するしかない</li>
              <li>・多額の現金の持ち運びリスク</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <p className="font-bold text-emerald-700">BUYMO エスクロー決済</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />代金は完了までBUYMOが保管</li>
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />受け渡し・名義変更の確認後に送金</li>
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />トラブル時は運営がサポート</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="mb-4 text-xl font-black text-navy-800">よくあるご質問</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none font-bold text-navy-800 marker:hidden">
                <span className="text-accent-600">Q. </span>{f.q}
              </summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-navy-50 p-6 text-center">
        <h2 className="text-lg font-black text-navy-800">安心の取引で、愛車を売買しませんか？</h2>
        <p className="mt-1 text-sm text-slate-500">出品は無料。売れなくても買取保証つきで安心です。</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/sell" className="btn-primary px-6">出品する</Link>
          <Link href="/listings" className="btn-outline px-6">車を探す</Link>
        </div>
      </section>
    </div>
  );
}
