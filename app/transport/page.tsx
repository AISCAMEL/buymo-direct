import { Truck, Phone, Globe, MapPin } from 'lucide-react';

export const metadata = { title: '陸送・輸送業者一覧' };

const CARRIERS = [
  {
    name: 'カーセンサーオートオークション輸送',
    area: '全国対応',
    price: '¥35,000〜（距離により変動）',
    phone: '0120-XXX-XXX',
    url: '#',
    note: '最短翌日輸送。法人・個人どちらも利用可。',
  },
  {
    name: 'トヨタ輸送株式会社',
    area: '全国（北海道・沖縄含む）',
    price: '¥40,000〜',
    phone: '0120-YYY-YYY',
    url: '#',
    note: 'キャリアカー輸送専門。キズ保証付き。',
  },
  {
    name: 'ゼロ (ZERO)',
    area: '関東・関西・東海',
    price: '¥25,000〜',
    phone: '0120-ZZZ-ZZZ',
    url: '#',
    note: 'ドアツードア対応。日時指定可。',
  },
  {
    name: 'イーカーゴ',
    area: '全国',
    price: '¥30,000〜（500km目安）',
    phone: '03-XXXX-XXXX',
    url: '#',
    note: 'オークション代行・個人間輸送実績多数。',
  },
];

export default function TransportPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Truck className="h-7 w-7 text-navy-500" />
        <div>
          <h1 className="text-2xl font-black">陸送・輸送業者一覧</h1>
          <p className="text-sm text-slate-500">遠方の出品者から車を購入する際にご利用ください</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        ※ 掲載業者は参考情報です。料金・サービス内容は必ず直接ご確認ください。
        BUYMO C2C は各業者との提携関係はなく、取引の保証を行いません。
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARRIERS.map((c) => (
          <div key={c.name} className="card space-y-3 p-5">
            <h2 className="font-black text-navy-700">{c.name}</h2>
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                {c.area}
              </p>
              <p className="flex items-center gap-2 font-bold text-accent-600">
                <Truck className="h-4 w-4 shrink-0 text-slate-400" />
                {c.price}
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                {c.phone}
              </p>
            </div>
            <p className="text-xs text-slate-500">{c.note}</p>
            <a href={c.url} target="_blank" rel="noopener noreferrer"
              className="btn-outline flex w-full items-center justify-center gap-1.5 text-sm">
              <Globe className="h-4 w-4" /> 公式サイト
            </a>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-black">輸送費用の目安（キャリアカー片道）</h2>
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
                ['関東〜関西', '¥30,000〜¥50,000', '1〜2日'],
                ['関東〜東海', '¥25,000〜¥40,000', '1日'],
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
      </div>
    </div>
  );
}
