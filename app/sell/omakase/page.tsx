import Link from 'next/link';
import type { Metadata } from 'next';
import { Sparkles, Camera, ClipboardList, HandCoins, Check, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { SITE_BASE } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-static';

const BASE = SITE_BASE;

export const metadata: Metadata = {
  title: 'おまかせ出品｜写真と情報を送るだけ、出品はBUYMOが代行',
  description: '忙しい方・出品が不安な方へ。写真と車の情報を送るだけで、BUYMOのスタッフが出品作成を代行します。買取保証つき・手数料0円で、売れなくても安心です。',
  alternates: { canonical: `${BASE}/sell/omakase` },
};

const STEPS = [
  { icon: ClipboardList, step: '01', title: '申し込み・情報を送る', desc: '車種・年式・走行距離などの基本情報と、お持ちの写真を送るだけ。入力は最短数分です。' },
  { icon: Camera, step: '02', title: 'スタッフが出品を作成', desc: '相場をふまえた価格の目安や、写真の撮り方・不足カットをBUYMOがアドバイス。魅力が伝わる出品ページを作成します。' },
  { icon: HandCoins, step: '03', title: '売却・入金', desc: '購入希望者とのやり取りもサポート。エスクロー決済で、引き渡し・名義変更の完了を確認してから安全に入金されます。' },
];

const FOR = [
  '出品や写真撮影に自信がない',
  '忙しくて手が回らない',
  '適正な価格の付け方がわからない',
  '個人間のやり取りが不安',
];

export default function OmakasePage() {
  return (
    <div className="space-y-10">
      <Breadcrumbs
        items={[
          { name: 'ホーム', url: `${BASE}/` },
          { name: 'おまかせ出品', url: `${BASE}/sell/omakase` },
        ]}
      />

      {/* ヒーロー */}
      <section className="rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-12 text-white">
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]"><Sparkles className="h-3.5 w-3.5" />おまかせ出品</span>
        <h1 className="text-3xl font-black sm:text-4xl">写真と情報を送るだけ。<br className="hidden sm:block" />出品はBUYMOが代行します。</h1>
        <p className="mt-3 max-w-2xl text-white/85">
          出品が不安な方・忙しい方へ。基本情報と写真を送っていただければ、相場をふまえた価格の目安づくりから出品ページの作成までBUYMOがサポート。<strong>買取保証つき・手数料0円</strong>なので、売れなくても安心です。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/contact" className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-black text-[#2E2408] hover:bg-gold-600">おまかせ出品を相談する <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/listings/valuation" className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold hover:bg-white/10">まず無料査定を試す</Link>
        </div>
      </section>

      {/* 流れ */}
      <section>
        <h2 className="mb-1 text-2xl font-black text-navy-800">かんたん3ステップ</h2>
        <p className="mb-6 text-sm text-slate-500">面倒な作業はおまかせ。あなたは送るだけです。</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="card p-5">
              <span className="mb-3 block text-3xl font-black text-slate-200">{step}</span>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Icon className="h-5 w-5" />
              </span>
              <p className="font-black text-navy-800">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* こんな方に */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
        <h2 className="mb-4 text-xl font-black text-navy-800">こんな方におすすめ</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FOR.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm font-bold text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{f}
            </li>
          ))}
        </ul>
      </section>

      {/* 安心ポイント */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: '買取保証つき', desc: '売れなくてもBUYMOが買い取ります。' },
          { icon: HandCoins, title: '出品・掲載は無料', desc: '出品料・掲載料は0円。査定・引取りも無料。' },
          { icon: Clock, title: '乗ったまま出品OK', desc: '売買成立まで通常どおり乗れます。' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card flex gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-500"><Icon className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black text-navy-800">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-gradient-to-r from-navy-700 to-navy-500 p-6 text-center text-white sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">まずはお気軽にご相談ください</h2>
        <p className="mt-1 text-sm text-white/85">ご相談・査定は無料。自分で出品したい方は、かんたん出品ウィザードもご利用いただけます。</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-black text-[#2E2408] hover:bg-gold-600">おまかせ出品を相談する</Link>
          <Link href="/sell/wizard" className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold hover:bg-white/10">自分で出品する（ウィザード）</Link>
        </div>
      </section>
    </div>
  );
}
