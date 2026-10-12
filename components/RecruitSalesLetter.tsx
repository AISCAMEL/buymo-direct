import Link from 'next/link';
import { AlertCircle, Heart, Lightbulb, Check, BadgeJapaneseYen, UserPlus, PlayCircle, Sparkles } from 'lucide-react';

/** 加盟募集用のセールスレター（新PASONAの法則）。
 *  P=問題提起 / A=共感 / SO=解決策 / O=提案(条件) / N→A=絞り込み・行動。
 *  「今の事業にもう一つの柱を」「初心者でも大丈夫」「無料セミナー」を核に構成。 */
export function RecruitSalesLetter({ genreName, joinHref }: { genreName: string; joinHref: string }) {
  return (
    <section className="space-y-5">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-xs font-black text-accent-600">
          <Sparkles className="h-3.5 w-3.5" /> はたらき方のご提案
        </span>
        <h2 className="mt-2 text-2xl font-black leading-tight text-navy-900">
          いまの事業に、<span className="text-accent-600">もう一つの柱</span>を。
        </h2>
      </div>

      {/* P：問題提起 */}
      <div className="card border-l-4 border-l-slate-300 p-6">
        <p className="flex items-center gap-2 font-black text-slate-800">
          <AlertCircle className="h-5 w-5 text-slate-400" /> こんなお悩み、ありませんか？
        </p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-600">
          <li>・本業の売上が頭打ち。収益の柱を、もう一本ふやしたい</li>
          <li>・{genreName}の技術も設備もあるのに、閑散期は手がすいてしまう</li>
          <li>・新規集客に広告費をかけても、思うように続かない</li>
        </ul>
      </div>

      {/* A：共感 */}
      <div className="card border-l-4 border-l-rose-300 p-6">
        <p className="flex items-center gap-2 font-black text-slate-800">
          <Heart className="h-5 w-5 text-rose-400" /> その気持ち、よく分かります。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          「腕は確かなのに、仕事の“波”で収入が安定しない」——これは、多くの車のプロが抱える共通の悩みです。
          良い技術があっても、<strong className="text-slate-800">“お客様とどう出会うか”はまったく別のスキル</strong>。
          そこでつまずいてしまう方が、本当に多いのです。
        </p>
      </div>

      {/* SO：解決策 */}
      <div className="card border-l-4 border-l-navy-500 bg-navy-50/50 p-6">
        <p className="flex items-center gap-2 font-black text-navy-800">
          <Lightbulb className="h-5 w-5 text-navy-500" /> だから、BUYMO。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          BUYMOは、全国の「車を売る人・買う人・直したい人」が集まるプラットフォーム。
          あなたは<strong className="text-navy-800">いまの事業を続けたまま</strong>、{genreName}の受注窓口を一つ増やすだけ。
          集客・広告・問い合わせ対応は、<strong className="text-navy-800">本部がまるごと代行</strong>します。
        </p>
      </div>

      {/* 初心者でも大丈夫 */}
      <div className="card border-l-4 border-l-emerald-400 p-6">
        <p className="flex items-center gap-2 font-black text-emerald-700">
          <Check className="h-5 w-5 text-emerald-500" /> はじめての方でも、問題ありません。
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {[
            '専任サポートが、登録から初受注まで伴走',
            '見積り・日程調整はチャットの案内どおりに進めるだけ',
            '受ける案件・エリア・ペースは、すべてあなたが選択',
            '無料オンラインセミナーで、始め方・稼ぎ方を基礎から',
          ].map((t) => (
            <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>
          ))}
        </ul>
      </div>

      {/* O：はじめやすい条件 */}
      <div className="card border-l-4 border-l-gold-400 p-6">
        <p className="flex items-center gap-2 font-black text-gold-700">
          <BadgeJapaneseYen className="h-5 w-5 text-gold-500" /> はじめやすい条件
        </p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-700">
          <li>・登録・掲載は<strong className="text-slate-900">無料（初期費用0円）</strong></li>
          <li>・費用がかかるのは、<strong className="text-slate-900">成約したときの手数料だけ</strong></li>
          <li>・在庫リスク・先行投資なしで、“もう一つの事業”を始められます</li>
        </ul>
      </div>

      {/* N→A：絞り込み・行動 */}
      <div className="rounded-3xl bg-navy-700 px-6 py-8 text-center text-white">
        <p className="text-lg font-black">まずは、話を聞くだけでもOK。</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-navy-100">
          「自分にもできそうか」を確かめてからで大丈夫です。無料登録でも、無料セミナーでも、
          あなたのペースで一歩を踏み出せます。
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={joinHref} className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-6 py-3 text-sm font-black text-navy-900 hover:bg-gold-400">
            <UserPlus className="h-4 w-4" /> 無料で登録する
          </Link>
          <Link href="/seminar" className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
            <PlayCircle className="h-4 w-4" /> 無料セミナーに参加する
          </Link>
        </div>
      </div>
    </section>
  );
}
