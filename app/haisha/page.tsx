import type { Metadata } from 'next';
import { Recycle, ShieldCheck, Banknote, Truck, FileCheck2 } from 'lucide-react';
import { HaishaSimulator } from './HaishaSimulator';

export const metadata: Metadata = {
  title: '廃車買取（その場提示）・事故車・不動車の買取｜BUYMO ダイレクト',
  description:
    '全国買取価格表をもとに廃車・事故車・不動車の買取額をその場で提示。還付金も別枠で概算。無料出張引取り・抹消手続き無料・リサイクル料金込みの買取。買取専門（ダイレクト販売なし）。',
};

export default function HaishaPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-500 px-6 py-10 text-white">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mint-200">
          <Recycle className="h-4 w-4" /> 廃車・事故車・不動車の買取
        </p>
        <h1 className="text-2xl font-black sm:text-3xl">金額をその場で提示。還付金も別枠で計算。</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          全国買取価格表（都道府県 × 排気量）をもとに概算をその場で提示します。無料出張引取り・廃車（抹消）手続き・還付金のご案内までワンストップ。
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          {['無料出張引取り', '抹消手続き無料', 'リサイクル料金込み買取', '買取専門（ダイレクト販売なし）'].map((t) => (
            <span key={t} className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">{t}</span>
          ))}
        </div>
      </section>

      <HaishaSimulator />

      {/* 4ステップ */}
      <section>
        <h2 className="mb-3 text-lg font-black text-navy-800">かんたん4ステップ</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { icon: Banknote, t: 'その場で提示', d: '金額に合意' },
            { icon: Truck, t: '無料引取り', d: '約4営業日で手配' },
            { icon: FileCheck2, t: '抹消手続き', d: '当社名義へ変更後に抹消（無料対応）' },
            { icon: ShieldCheck, t: '入金＋還付', d: '買取金のお支払い・還付金のお戻し' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.t} className="card p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-700 text-xs font-black text-white">{i + 1}</span>
                  <Icon className="h-5 w-5 text-navy-500" />
                </div>
                <p className="text-sm font-bold text-navy-800">{s.t}</p>
                <p className="text-xs text-slate-500">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 leading-relaxed">
        ※全てリサイクル料金・消費税を含めての買取です。※リサイクル料金が未預託の場合は買取価格から差し引き（マイナス時は無料引取り）。
        ※お引取り日はご依頼から約4営業日。※抹消手続きは必要書類のご準備で無料対応（当社名義に変更後に抹消）。
        ※バッテリー・マフラー等の欠品は減額または引取不可の場合があります。※一部エリアは対応不可・減額の場合があります。
        ※提示額・還付金・減額は概算で、車両確認後に確定します。
      </div>
    </div>
  );
}
