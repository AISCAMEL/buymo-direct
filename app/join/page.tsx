import { Check, Sparkles, Store, TrendingUp } from 'lucide-react';
import { JoinLeadForm } from '@/components/JoinLeadForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: '加盟店・プロ登録（無料） | BUYMO ダイレクト' };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const sp = await searchParams;
  const source = sp.source || 'join';

  const freeItems = ['プロとしてスキル提供（整備・板金・コーティング等）', '案件の受注・チャット', '店舗プロフィールの公開', '出品（ダイレクト販売）'];
  const paidItems = ['業販・仕入れ相場の詳細表示', 'オンライン講座「買取を学ぶ」実践編', 'プロ向けの限定情報・非公開データ', '成約手数料の優遇', '上位表示・集客ブースト'];

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-xs font-black text-accent-600">
          <Sparkles className="h-3.5 w-3.5" /> 登録無料
        </span>
        <h1 className="mt-3 text-3xl font-black leading-tight">車のプロ・加盟店になる</h1>
        <p className="mt-2 text-sm text-slate-600">
          まずは<strong>無料</strong>でプロ登録。スキル提供・受注から始めて、ゆくゆくは<strong>買取加盟店</strong>として在庫販売・買取まで。
        </p>
      </div>

      {/* 3ステップ */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {[
          { icon: Check, t: '無料登録', d: 'プロとしてスキル提供' },
          { icon: TrendingUp, t: '有料会員', d: '限定情報・相場が見える' },
          { icon: Store, t: '買取加盟店', d: '在庫販売・買取まで' },
        ].map((s) => (
          <div key={s.t} className="rounded-xl bg-slate-50 p-3">
            <s.icon className="mx-auto mb-1 h-5 w-5 text-navy-500" />
            <p className="font-black text-navy-800">{s.t}</p>
            <p className="mt-0.5 leading-tight text-slate-500">{s.d}</p>
          </div>
        ))}
      </div>

      {/* フォーム */}
      <JoinLeadForm source={source} />

      {/* プラン比較 */}
      <section id="plan" className="scroll-mt-20 space-y-3">
        <h2 className="text-center text-xl font-black">無料会員と有料会員のちがい</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-5">
            <p className="font-black text-slate-700">無料会員でできること</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {freeItems.map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="card border-accent-200 bg-accent-50/40 p-5">
            <p className="font-black text-accent-700">有料会員・加盟店で見える範囲</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
              {paidItems.map((t) => (
                <li key={t} className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />{t}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">※ 料金・特典の詳細は担当よりご案内します。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
