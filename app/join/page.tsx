import Link from 'next/link';
import { Check, Sparkles, Wrench, SprayCan, Cable, Truck, UserPlus, ClipboardCheck, Megaphone, Handshake } from 'lucide-react';
import { JoinLeadForm } from '@/components/JoinLeadForm';
import { getPricingConfig } from '@/lib/settings';
import { formatYen } from '@/lib/format';
import { faqPageJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'プロ登録（無料）',
  description:
    'まずは無料でプロ登録。整備・板金・コーティング・電装・陸送など異業種も登録・スキル提供できます。掲載料・初期費用0円、かかるのは成約したときの手数料だけ。',
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const sp = await searchParams;
  const source = sp.source || 'join';
  const cfg = await getPricingConfig();

  const freeItems = [
    'プロとしてスキル提供（整備・板金・コーティング・電装 等）',
    'お客様からの案件受注・チャット',
    '店舗・プロフィールの公開',
    '出品（ダイレクト販売）',
  ];

  const pct = (r: number) => `${Math.round(r * 100)}%`;
  const rateOf = (c: string) => cfg.matchingFeeRateByCategory?.[c] ?? cfg.matchingFeeDefaultRate;
  const feeCats = [
    { c: '整備・修理', d: '整備・車検・板金塗装' },
    { c: '美装', d: 'コーティング・清掃・ラッピング' },
    { c: '電装・取付', d: 'ナビ・ドラレコ・ETC 取付' },
    { c: '物流・手続き', d: '陸送・名義変更・廃車' },
  ];

  const trades = [
    { icon: Wrench, t: '整備・板金', d: '車検・修理・鈑金塗装の受注。納車前整備や仕上げもまとめて受注できます。', rate: rateOf('整備・修理') },
    { icon: SprayCan, t: 'コーティング・美装', d: 'コーティング・室内クリーニング・ラッピングをお客様から直接受注。', rate: rateOf('美装') },
    { icon: Cable, t: '電装・取付', d: 'ドラレコ・ナビ・ETC の取付や電装トラブル対応。取付込みの販売にも対応。', rate: rateOf('電装・取付') },
    { icon: Truck, t: '陸送・手続き', d: '全国の陸送、名義変更などの書類手続きを代行。遠方取引の受け皿に。', rate: rateOf('物流・手続き') },
  ];

  const flow = [
    { icon: UserPlus, t: '無料登録', d: 'スキルと対応エリアを登録。費用はかかりません。' },
    { icon: ClipboardCheck, t: '本部審査', d: '実績・対応範囲を確認のうえ掲載を承認します。' },
    { icon: Megaphone, t: 'プロフィール公開', d: '「車のプロを探す」に掲載され、お客様の目に触れます。' },
    { icon: Handshake, t: '受注・成約', d: 'チャットで見積・調整。成約時のみ手数料が発生します。' },
  ];

  const faqs = [
    { q: '登録に費用はかかりますか？', a: 'プロとしてスキル提供する登録は無料（¥0）です。掲載料・初期費用もありません。かかるのは成約したときの手数料だけです。' },
    { q: '販売店でなくても登録できますか？', a: 'はい。板金・整備・コーティング・電装・陸送など、異業種のプロも登録・スキル提供できます。得意分野だけで受注を始められます。' },
    { q: '手数料はいくらですか？', a: `成約時のみ、カテゴリ別の成約手数料がかかります（整備・美装・電装 ${pct(rateOf('整備・修理'))}、陸送・手続き ${pct(rateOf('物流・手続き'))} など。最低 ${formatYen(cfg.matchingFeeMinFee)}・税抜）。受注がなければ費用は発生しません。` },
    { q: 'どうやって依頼が来ますか？', a: '「車のプロを探す」でお客様がプロを閲覧し、直接ご依頼いただけます。チャットで見積・日程を調整し、合意後に成約となります。' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs)) }} />

      <div className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-xs font-black text-accent-600">
          <Sparkles className="h-3.5 w-3.5" /> 登録無料
        </span>
        <h1 className="mt-3 text-3xl font-black leading-tight">車のプロとして、無料で始める</h1>
        <p className="mt-2 text-sm text-slate-600">
          まずは<strong>無料</strong>でプロ登録。スキル提供・受注から、自分のペースで始められます。
          販売店以外（<strong>板金・整備・コーティング・電装・陸送</strong>など異業種）も登録・スキル提供できます。
        </p>
        <p className="mt-3 text-4xl font-black text-emerald-600">¥0</p>
        <p className="text-xs text-slate-400">掲載料・初期費用なし／かかるのは成約手数料だけ</p>
        <Link href="/recruit" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline">
          ジャンル別の募集ページ（整備・板金・行政書士・レンタカー 等）を見る →
        </Link>
      </div>

      {/* 無料でできること */}
      <section className="space-y-3">
        <h2 className="text-center text-xl font-black">無料登録でできること</h2>
        <div className="card p-5">
          <ul className="space-y-2 text-sm text-slate-700">
            {freeItems.map((t) => (
              <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* フォーム */}
      <JoinLeadForm source={source} />

      {/* 異業種別の活用例 */}
      <section className="space-y-3">
        <h2 className="text-center text-xl font-black">こんな業種が活躍しています</h2>
        <p className="text-center text-sm text-slate-500">得意なスキルで受注。販売店以外のプロも歓迎です。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {trades.map((t) => (
            <div key={t.t} className="card flex gap-3 p-5">
              <t.icon className="mt-0.5 h-6 w-6 shrink-0 text-navy-500" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-800">{t.t}</p>
                  <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-black text-accent-600">手数料 {pct(t.rate)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 料金：成約手数料のみ */}
      <section id="fees" className="scroll-mt-20 space-y-3">
        <h2 className="text-center text-xl font-black">料金は成約手数料だけ</h2>
        <p className="text-center text-sm text-slate-500">掲載料・初期費用は0円。受注がなければ費用は発生しません。</p>
        <div className="card overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="font-black text-slate-700">成約手数料（カテゴリ別）</p>
            <p className="text-xs text-slate-400">成約金額に対して発生。最低 {formatYen(cfg.matchingFeeMinFee)}（税抜）。</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {feeCats.map((f) => (
              <li key={f.c} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">{f.c}</p>
                  <p className="text-xs text-slate-400">{f.d}</p>
                </div>
                <span className="tabular-nums text-lg font-black text-accent-600">{pct(rateOf(f.c))}</span>
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 text-xs text-slate-400">※ 料率は予告なく改定される場合があります。最新の条件は登録後にご案内します。</p>
        </div>
      </section>

      {/* 加盟の流れ */}
      <section className="space-y-3">
        <h2 className="text-center text-xl font-black">登録から受注までの流れ</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {flow.map((s, i) => (
            <li key={s.t} className="card relative p-4 text-center">
              <span className="absolute left-3 top-3 text-xs font-black text-slate-300">{i + 1}</span>
              <s.icon className="mx-auto mb-1.5 h-6 w-6 text-navy-500" />
              <p className="text-sm font-black text-navy-800">{s.t}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="text-center text-xl font-black">よくある質問</h2>
        <div className="space-y-2">
          {faqs.map((f) => (
            <details key={f.q} className="card group p-4">
              <summary className="cursor-pointer list-none font-bold text-slate-800 marker:hidden">
                <span className="text-accent-600">Q. </span>{f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
