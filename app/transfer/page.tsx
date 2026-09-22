import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText, ClipboardCheck, Send, CheckCircle2, Car, UserCheck } from 'lucide-react';

export const revalidate = 3600;
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

export const metadata: Metadata = {
  title: '名義変更代行｜面倒な移転登録をおまかせ｜BUYMO ダイレクト',
  description: '陸運局での名義変更（移転登録）手続きをBUYMO ダイレクトが代行。必要書類のご案内・回収から手続き完了まで。個人間・ダイレクト販売でも安心して所有者変更ができます。',
  alternates: { canonical: `${BASE}/transfer` },
};

const STEPS = [
  { n: '1', title: '必要書類のご案内', desc: '売主・買主それぞれに必要な書類を分かりやすくご案内します。', icon: FileText },
  { n: '2', title: '書類のご準備・提出', desc: '書類がそろったらBUYMOへ。内容を確認し、陸運局での手続きを代行します。', icon: ClipboardCheck },
  { n: '3', title: '名義変更（移転登録）', desc: '運輸支局・軽自動車検査協会で所有者・使用者の変更手続きを行います。', icon: Send },
  { n: '4', title: '完了のご連絡', desc: '新しい車検証をお届け。名義変更の完了をご連絡します。', icon: CheckCircle2 },
];

const DOCS_SELLER = [
  '車検証（原本）',
  '実印・印鑑証明書（発行後3か月以内）',
  '譲渡証明書（実印を押印）',
  '委任状（実印を押印）',
  '自賠責保険証明書',
  '住所変更がある場合は住民票など',
];
const DOCS_BUYER = [
  '印鑑証明書（発行後3か月以内）',
  '実印',
  '車庫証明（保管場所証明書）',
  '委任状（実印を押印）',
  'マイナンバー等の本人確認書類',
];

const FAQ = [
  { q: '自分で名義変更するのは大変ですか？', a: '陸運局へ平日に出向き、複数の書類を用意する必要があります。仕事の都合で行けない方や、書類に不安がある方は代行がおすすめです。' },
  { q: '軽自動車でも対応できますか？', a: 'はい。普通車（運輸支局）・軽自動車（軽自動車検査協会）どちらも対応します。' },
  { q: 'どれくらいの期間で完了しますか？', a: '書類がそろってから、通常1〜2週間程度が目安です（地域・混雑状況により前後します）。' },
  { q: '料金はいくらですか？', a: '代行手数料の目安は1万円〜（税・実費別）。車種・地域・出張回収の有無により変動します。正確な金額は事前にご案内します。' },
];

export default function TransferPage() {
  return (
    <div className="space-y-12">
      {/* ヒーロー */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-accent-600 to-accent-500 px-6 py-12 text-white">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-green-100"><Car className="h-4 w-4" />名義変更代行</p>
        <h1 className="text-3xl font-black sm:text-4xl">面倒な名義変更、まるごとおまかせ</h1>
        <p className="mt-3 max-w-2xl text-green-50">
          陸運局での<strong className="font-bold text-white">移転登録（所有者変更）</strong>手続きをBUYMO ダイレクトが代行します。
          平日に役所へ行けない方も、書類が不安な方も安心。個人間・ダイレクト販売の取引をスムーズに完了できます。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-xl bg-white px-6 py-2.5 text-sm font-black text-accent-600 transition hover:bg-green-50">相談する（無料）</Link>
          <Link href="/sell" className="rounded-xl border border-white/40 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">出品する</Link>
        </div>
      </section>

      {/* 流れ */}
      <section>
        <h2 className="mb-1 text-xl font-black text-navy-800">名義変更代行の流れ</h2>
        <p className="mb-6 text-sm text-slate-500">書類のご案内から完了のご連絡まで、しっかりサポートします。</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-500 text-sm font-black text-white">{s.n}</span>
                  <Icon className="h-5 w-5 text-accent-600" />
                </div>
                <h3 className="font-black text-navy-800">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 必要書類 */}
      <section>
        <h2 className="mb-1 text-xl font-black text-navy-800">必要書類の目安</h2>
        <p className="mb-6 text-sm text-slate-500">普通車の一般的な例です。車種・状況により異なる場合があります（担当が個別にご案内します）。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-3 flex items-center gap-2 font-black text-navy-800"><UserCheck className="h-5 w-5 text-navy-500" />売主（今の所有者）</p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {DOCS_SELLER.map((d) => <li key={d} className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{d}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-3 flex items-center gap-2 font-black text-navy-800"><UserCheck className="h-5 w-5 text-accent-600" />買主（新しい所有者）</p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {DOCS_BUYER.map((d) => <li key={d} className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{d}</li>)}
            </ul>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          ※ 軽自動車は必要書類が異なります（印鑑証明・車庫証明が不要な地域もあります）。詳しくはお問い合わせください。
        </p>
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
        <h2 className="text-lg font-black text-navy-800">名義変更のご相談は無料です</h2>
        <p className="mt-1 text-sm text-slate-500">必要書類のご案内から、手続き完了までサポートします。</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn-primary px-6">相談する（無料）</Link>
          <Link href="/escrow" className="btn-outline px-6">エスクロー決済について</Link>
        </div>
      </section>
    </div>
  );
}
