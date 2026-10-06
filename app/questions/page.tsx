import Link from 'next/link';
import type { Metadata } from 'next';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { SITE_BASE } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-static';

const BASE = SITE_BASE;

export const metadata: Metadata = {
  title: 'よくある質問（FAQ）｜BUYMO ダイレクト',
  description: '中古車の個人間売買・ダイレクト販売に関するよくある質問。手数料、買取保証、エスクロー決済、名義変更、必要書類、安全性についてBUYMOがお答えします。',
  alternates: { canonical: `${BASE}/questions` },
};

type QA = { q: string; a: string };
type Group = { category: string; items: QA[] };

const FAQ: Group[] = [
  {
    category: 'サービス・手数料',
    items: [
      { q: 'BUYMO ダイレクトとは何ですか？', a: '個人間・販売店とのダイレクト（直接）売買ができる中古車プラットフォームです。買取保証つきで、売れなくてもBUYMOが買い取るので安心してご利用いただけます。' },
      { q: '手数料はかかりますか？', a: '出品・掲載は無料です。取引にかかる費用は内容により異なりますので、各サービスのご案内をご確認ください。査定・引取りは無料です。' },
      { q: '利用に登録は必要ですか？', a: '車を探すだけなら登録なしで閲覧できます。お気に入り保存・出品・メッセージのやり取りには無料の会員登録が必要です。' },
    ],
  },
  {
    category: '買う方',
    items: [
      { q: '気になる車が見つかったら？', a: '車両ページから出品者へメッセージで質問・交渉できます。価格交渉はオファー機能もご利用いただけます。' },
      { q: '相場より安いか分かりますか？', a: '車両一覧の「相場サマリ」や詳細ページの価格評価バッジで、同条件の相場に対して安いかどうかを確認できます。' },
      { q: 'ローンは使えますか？', a: 'ご利用いただけます。車両詳細ページのローンシミュレーションで月々の目安を試算し、そのまま仮審査を申し込めます。' },
      { q: '現車確認はできますか？', a: '出品者とメッセージで日程を調整して現車確認が可能です。遠方の場合は追加写真の依頼もできます。' },
    ],
  },
  {
    category: '売る方',
    items: [
      { q: 'どうやって出品しますか？', a: '写真と年式・走行距離などを入力するだけ。かんたん出品ウィザードやAIによる説明文作成も使えます。写真の撮り方ガイドもご用意しています。' },
      { q: '売れなかったらどうなりますか？', a: '買取保証つきなので、売れなくてもBUYMOが買い取ります。すぐ現金化したい方は買取もご利用いただけます。' },
      { q: '適正な価格が分かりません。', a: '出品フォームの価格ガイドで、同条件（メーカー・車種・年式）の掲載相場（中央値・価格帯）を確認しながら値付けできます。無料査定もご利用ください。' },
      { q: '出品中も車に乗れますか？', a: '乗ったままご出品いただけます。売買が成立するまで通常どおりご利用いただけます。' },
    ],
  },
  {
    category: '支払い・安全性',
    items: [
      { q: '代金の受け渡しは安全ですか？', a: 'エスクロー（第三者預託）決済に対応しています。買主の入金を第三者が保全し、引き渡し・名義変更の完了を確認してから売主へ送金されるため、持ち逃げ・未払いのリスクを抑えられます。' },
      { q: '個人間取引が不安です。', a: '本人確認（KYC）、エスクロー決済、取引メッセージの記録、名義変更代行など、安心して取引できる仕組みを用意しています。' },
    ],
  },
  {
    category: '名義変更・書類',
    items: [
      { q: '名義変更は自分でやるのですか？', a: 'ご自身でも可能ですが、不安な方はBUYMOの名義変更代行をご利用いただけます。必要書類のご案内・回収から手続き完了までサポートします。' },
      { q: '必要な書類が分かりません。', a: '必要書類案内ページで、売る方・買う方／普通車・軽ごとに必要書類をご案内しています。委任状・譲渡証明書などの様式もダウンロードできます。' },
    ],
  },
];

export default function QuestionsPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.flatMap((g) =>
      g.items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    ),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Breadcrumbs
        items={[
          { name: 'ホーム', url: `${BASE}/` },
          { name: 'よくある質問', url: `${BASE}/questions` },
        ]}
      />

      <div>
        <p className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-teal-600">
          <HelpCircle className="h-4 w-4" />faq
        </p>
        <h1 className="mt-1 text-3xl font-black">よくある質問</h1>
        <p className="mt-2 text-sm text-slate-600">BUYMO ダイレクトのご利用に関するよくあるご質問をまとめました。</p>
      </div>

      {FAQ.map((g) => (
        <section key={g.category}>
          <h2 className="mb-3 text-lg font-black text-navy-700">{g.category}</h2>
          <div className="space-y-2">
            {g.items.map((it) => (
              <details key={it.q} className="group rounded-xl border border-slate-200 bg-white p-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-bold text-navy-800 marker:hidden">
                  <span><span className="text-accent-600">Q. </span>{it.q}</span>
                  <span className="mt-0.5 shrink-0 text-slate-400 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{it.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-2xl bg-navy-50 p-6 text-center">
        <p className="font-black text-navy-800">解決しない場合はお問い合わせください</p>
        <p className="mt-1 text-sm text-slate-600">担当がていねいにご案内します。査定・ご相談は無料です。</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/contact" className="btn-accent inline-flex items-center gap-1">お問い合わせ <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/listings/valuation" className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">無料査定を試す</Link>
        </div>
      </div>
    </div>
  );
}
