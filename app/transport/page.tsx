import type { Metadata } from 'next';
import { Truck, Phone, MapPin, ShieldCheck, Clock, Star } from 'lucide-react';
import { TransportSimulator } from './TransportSimulator';

export const metadata: Metadata = {
  title: '陸送・車の輸送（料金シミュレーション＆申込）｜BUYMO ダイレクト',
  description: '出発地・到着地・車のサイズを選ぶだけで陸送料金の目安が分かる。そのままオンラインで申し込みできます。全国対応・ZERO（ゼロ）手配で安心。',
};

export default function TransportPage() {
  return (
    <div className="space-y-10">
      {/* ヒーロー */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 to-navy-500 px-6 py-10 text-white">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mint-200"><Truck className="h-4 w-4" />車の陸送</p>
        <h1 className="text-2xl font-black sm:text-3xl">料金をその場で確認して、そのまま申し込み</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          遠方の車もおまかせ。出発地・到着地・車のサイズを選ぶだけで概算料金が分かります。
          全国対応の <strong className="font-bold text-white">ZERO（ゼロ）</strong> を基本に、BUYMOが手配します。
        </p>
      </section>

      {/* シミュレーション＋申込 */}
      <TransportSimulator />

      {/* ZERO（基本の輸送パートナー） */}
      <section>
        <h2 className="mb-3 text-lg font-black text-navy-800">基本の輸送パートナー</h2>
        <div className="card border-2 border-navy-200 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-navy-500 px-2.5 py-0.5 text-xs font-black text-white">おすすめ</span>
            <h3 className="text-lg font-black text-navy-800">ZERO（ゼロ）</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">創業以来、数多くの車両輸送を手がける大手。全国ネットワークで安心のドアツードア輸送。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: MapPin, t: '全国対応', d: '離島（北海道・沖縄）も手配可能' },
              { icon: ShieldCheck, t: '安心の輸送品質', d: 'キャリアカー輸送・輸送中の品質管理' },
              { icon: Clock, t: '日時のご相談OK', d: '集荷日・お届け日を調整' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.t} className="rounded-xl bg-slate-50 p-3">
                  <Icon className="mb-1 h-5 w-5 text-navy-500" />
                  <p className="text-sm font-bold text-navy-800">{f.t}</p>
                  <p className="text-xs text-slate-500">{f.d}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Star className="h-3.5 w-3.5 text-gold-500" /> 上のシミュレーションから申し込むと、BUYMOがZEROへ手配し、正式なお見積り・集荷日をご連絡します。
          </p>
        </div>
      </section>

      {/* 料金の目安 */}
      <section className="card p-5">
        <h2 className="mb-1 font-black text-navy-800">料金の目安（キャリアカー片道・普通車）</h2>
        <p className="mb-3 text-xs text-slate-500">車のサイズ・集荷場所・時期により変動します。正確な金額はお申し込み後にご案内します。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2 text-left">区間</th>
                <th className="pb-2 text-right">目安金額</th>
                <th className="pb-2 text-right">所要日数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['同一地方内', '¥15,000〜¥25,000', '1日'],
                ['関東〜東海', '¥25,000〜¥40,000', '1日'],
                ['関東〜関西', '¥30,000〜¥50,000', '1〜2日'],
                ['関東〜東北', '¥30,000〜¥45,000', '1〜2日'],
                ['関東〜九州', '¥50,000〜¥80,000', '2〜3日'],
                ['本州〜北海道', '¥80,000〜¥120,000', '3〜5日'],
                ['本州〜沖縄', '¥100,000〜¥150,000', '5〜7日'],
              ].map(([area, price, days]) => (
                <tr key={area}>
                  <td className="py-2 pr-4">{area}</td>
                  <td className="py-2 pr-4 text-right font-bold text-accent-600">{price}</td>
                  <td className="py-2 text-right text-slate-500">{days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
        ※ 表示金額はすべて目安です。正式なお見積りは、車両・集荷場所・日程等をもとにご案内します。
        <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />お急ぎの場合はお問い合わせページからもご連絡いただけます。</span>
      </div>
    </div>
  );
}
