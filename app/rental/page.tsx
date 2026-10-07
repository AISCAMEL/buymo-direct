import type { Metadata } from 'next';
import Link from 'next/link';
import { Car, CalendarClock, Repeat, ShieldCheck, Search, Store, ArrowRight, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'レンタカー・カーリース・車のサブスク｜BUYMO ダイレクト',
  description:
    'レンタカー・カーリース・車のサブスクを、BUYMO認定のプロに直接依頼。短期から長期・代車まで全国対応。レンタカー会社・リース会社など異業種も無料で登録・集客できます。',
};

const SERVICES = [
  { icon: Car, t: 'レンタカー', d: '短期・スポット利用から。代車の手配も。', q: 'rental' },
  { icon: Repeat, t: 'カーリース', d: '頭金なし・月々定額で新車/中古車に乗る。', q: 'lease' },
  { icon: CalendarClock, t: '車のサブスク', d: '税金・保険・メンテ込みの月額プラン。', q: 'subscription' },
];

export default function RentalPage() {
  const dirHref = `/dealers?category=${encodeURIComponent('レンタカー・リース')}`;
  return (
    <div className="space-y-10">
      {/* ヒーロー */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-500 px-6 py-10 text-white">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mint-200">
          <Car className="h-4 w-4" /> レンタカー・リース・サブスク
        </p>
        <h1 className="text-2xl font-black sm:text-3xl">借りる・乗り続けるも、プロにおまかせ。</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          レンタカー・カーリース・車のサブスクを、BUYMO認定のプロに直接依頼。短期から長期・代車まで全国対応です。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={dirHref} className="btn-gold flex items-center gap-1">
            <Search className="h-4 w-4" /> レンタカー・リースのプロを探す
          </Link>
          <Link href="/join?source=rental" className="btn bg-white/12 px-5 py-2.5 font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25">
            事業者の方はこちら（無料登録）
          </Link>
        </div>
      </section>

      {/* サービス3種 */}
      <section>
        <h2 className="mb-4 text-lg font-black text-navy-800">選べる3つの乗り方</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.t} href={`/dealers?skill=${s.q}`} className="card flex flex-col p-5 transition hover:shadow-md">
                <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50">
                  <Icon className="h-6 w-6 text-accent-600" />
                </span>
                <p className="text-base font-black text-navy-800">{s.t}</p>
                <p className="mt-1 flex-1 text-sm text-slate-600">{s.d}</p>
                <span className="mt-3 flex items-center gap-0.5 text-sm font-bold text-accent-600">
                  対応店を探す <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 顧客メリット */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, t: 'BUYMO認定のプロ', d: '審査済みの事業者だから安心' },
          { icon: Search, t: '地域・条件で比較', d: '対応エリア・料金目安を一覧で' },
          { icon: Check, t: 'そのまま依頼', d: 'チャットで相談→見積→成約' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50"><Icon className="h-5 w-5 text-navy-600" /></span>
            <div><p className="text-sm font-bold text-navy-800">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
          </div>
        ))}
      </section>

      {/* 事業者向け（異業種登録） */}
      <section className="card border-2 border-gold-200 bg-gold-50 p-6">
        <div className="flex items-start gap-3">
          <Store className="mt-0.5 h-6 w-6 shrink-0 text-gold-600" />
          <div className="flex-1">
            <h2 className="text-lg font-black text-navy-800">レンタカー会社・リース会社の方へ（無料登録）</h2>
            <p className="mt-1 text-sm text-slate-600">
              販売店以外の異業種も、<strong>無料</strong>でスキル（提供サービス）を登録して集客できます。
              顧客からの依頼が届き、<strong>成約したときだけ手数料</strong>（既定10%）。初期費用・月額は不要です。
            </p>
            <ul className="mt-3 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
              <li className="flex gap-2"><Check className="h-4 w-4 text-accent-600" />登録無料・掲載無料</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-accent-600" />成約時のみ手数料（10%）</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-accent-600" />対応エリア・料金目安を掲載</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-accent-600" />レンタカー・リース・サブスクに対応</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/join?source=rental" className="btn-gold px-5 py-2.5 text-sm">無料で事業者登録する</Link>
              <Link href={dirHref} className="btn-outline px-5 py-2.5 text-sm">掲載イメージを見る</Link>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        ※ 料金・プランは各事業者により異なります。詳細は各店舗のプロフィール・お見積りをご確認ください。
      </p>
    </div>
  );
}
