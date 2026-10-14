'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

export type ResultType = 'kaitori' | 'direct' | 'loan' | 'hikaku' | 'sold';
export type SaleItem = { pref: string; type: ResultType; person?: string; car: string; price: string; voice?: string; car_e: string; face_e: string };

// 種別の表示（バッジ色・ラベル・金額の接尾辞）
const TYPE_META: Record<ResultType, { label: string; cls: string; suffix: string; grad: string }> = {
  kaitori: { label: '直接買取', cls: 'bg-accent-500 text-white', suffix: 'で買取', grad: 'from-accent-100 to-orange-100' },
  direct: { label: 'ダイレクト販売', cls: 'bg-navy-600 text-white', suffix: 'で販売', grad: 'from-navy-100 to-slate-200' },
  loan: { label: 'ローン購入', cls: 'bg-emerald-600 text-white', suffix: 'で購入', grad: 'from-emerald-100 to-teal-100' },
  hikaku: { label: '他社比較', cls: 'bg-gold-500 text-navy-900', suffix: 'で売却', grad: 'from-gold-100 to-amber-100' },
  sold: { label: '成約', cls: 'bg-emerald-600 text-white', suffix: 'で成約', grad: 'from-emerald-100 to-teal-100' },
};

// 表示イメージ（サンプル・全47都道府県）。実成約が貯まると実データに自動切替。
const SAMPLE: SaleItem[] = [
  { pref: '北海道', type: 'kaitori', person: '50代 男性', car: 'スバル フォレスター', price: '¥1,540,000', voice: '遠方でも出張査定＋陸送まで手配してくれました。', car_e: '🚙', face_e: '👴' },
  { pref: '青森県', type: 'direct', person: '30代 男性', car: 'トヨタ ハリアー', price: '¥2,980,000', voice: '販売店を通さず直接売れて手取りが増えました。', car_e: '🚙', face_e: '🧑' },
  { pref: '岩手県', type: 'loan', person: '20代 男性', car: 'ホンダ フィット', price: '¥1,180,000', voice: '低金利ローンで無理なく購入できました。', car_e: '🚗', face_e: '👨' },
  { pref: '宮城県', type: 'hikaku', person: '40代 男性', car: 'トヨタ プリウス', price: '¥1,760,000', voice: '他社より12万円高い査定で決めました。', car_e: '🚗', face_e: '🧑' },
  { pref: '秋田県', type: 'kaitori', person: '60代 男性', car: 'ダイハツ タント', price: '¥720,000', voice: '過走行でもしっかり値段がつきました。', car_e: '🚗', face_e: '👴' },
  { pref: '山形県', type: 'direct', person: '40代 女性', car: '日産 ノート', price: '¥1,240,000', voice: '写真を送るだけでダイレクト販売できました。', car_e: '🚗', face_e: '👩' },
  { pref: '福島県', type: 'loan', person: '30代 女性', car: 'スズキ ハスラー', price: '¥1,420,000', voice: '頭金なしのプランで購入、審査も早かった。', car_e: '🚙', face_e: '👩' },
  { pref: '茨城県', type: 'hikaku', person: '50代 男性', car: 'トヨタ アルファード', price: '¥3,280,000', voice: '下取りより40万円高く売れました。', car_e: '🚐', face_e: '🧔' },
  { pref: '栃木県', type: 'kaitori', person: '30代 男性', car: 'マツダ CX-30', price: '¥1,980,000', voice: '手数料0円で思ったより高額でした。', car_e: '🚙', face_e: '🧑' },
  { pref: '群馬県', type: 'direct', person: '40代 男性', car: 'ホンダ ステップワゴン', price: '¥1,860,000', voice: '全国の買い手に届いて早く売れました。', car_e: '🚐', face_e: '🧑' },
  { pref: '埼玉県', type: 'loan', person: '20代 女性', car: 'トヨタ アクア', price: '¥1,320,000', voice: '学生でも通るプランで購入できました。', car_e: '🚗', face_e: '👩' },
  { pref: '千葉県', type: 'hikaku', person: '50代 女性', car: 'ホンダ ヴェゼル', price: '¥2,080,000', voice: '3社比較でいちばん高いBUYMOに。', car_e: '🚙', face_e: '👩‍🦰' },
  { pref: '東京都', type: 'kaitori', person: '40代 男性', car: 'レクサス RX', price: '¥4,650,000', voice: '来店不要で高額買取、入金も早かった。', car_e: '🚙', face_e: '🧑' },
  { pref: '神奈川県', type: 'direct', person: '30代 女性', car: 'ホンダ N-BOX', price: '¥1,120,000', voice: '来店なしで完結して楽でした。', car_e: '🚗', face_e: '👩' },
  { pref: '新潟県', type: 'loan', person: '40代 男性', car: 'スバル レヴォーグ', price: '¥2,560,000', voice: '雪国の4WD、ローンで賢く乗り換え。', car_e: '🚙', face_e: '🧑' },
  { pref: '富山県', type: 'hikaku', person: '50代 男性', car: 'トヨタ ランドクルーザー', price: '¥5,200,000', voice: '他社提示を大きく上回りました。', car_e: '🚙', face_e: '🧔' },
  { pref: '石川県', type: 'kaitori', person: '30代 男性', car: '日産 セレナ', price: '¥1,680,000', voice: '事故歴ありでも正直に査定。', car_e: '🚐', face_e: '🧑' },
  { pref: '福井県', type: 'direct', person: '40代 女性', car: 'ダイハツ ムーヴ', price: '¥680,000', voice: '軽でもダイレクト販売で納得価格。', car_e: '🚗', face_e: '👩' },
  { pref: '山梨県', type: 'loan', person: '20代 男性', car: 'トヨタ ヤリス', price: '¥1,340,000', voice: '初めての購入、手続きも簡単でした。', car_e: '🚗', face_e: '👨' },
  { pref: '長野県', type: 'hikaku', person: '50代 男性', car: 'スバル アウトバック', price: '¥2,240,000', voice: '比較して10万円以上の差がつきました。', car_e: '🚙', face_e: '🧔' },
  { pref: '岐阜県', type: 'kaitori', person: '40代 男性', car: 'トヨタ ヴォクシー', price: '¥1,920,000', voice: 'スピード査定で即決できました。', car_e: '🚐', face_e: '🧑' },
  { pref: '静岡県', type: 'direct', person: '30代 男性', car: 'マツダ ロードスター', price: '¥1,780,000', voice: '趣味車も全国のファンに届きました。', car_e: '🏎️', face_e: '🧑' },
  { pref: '愛知県', type: 'loan', person: '30代 男性', car: '日産 エクストレイル', price: '¥2,380,000', voice: '残価設定で月々を抑えて購入。', car_e: '🚙', face_e: '🧑' },
  { pref: '三重県', type: 'hikaku', person: '40代 女性', car: 'ホンダ フリード', price: '¥1,560,000', voice: '他店より高く、対応も丁寧でした。', car_e: '🚐', face_e: '👩' },
  { pref: '滋賀県', type: 'kaitori', person: '50代 男性', car: 'トヨタ クラウン', price: '¥2,650,000', voice: '高年式を高評価してもらえました。', car_e: '🚗', face_e: '🧔' },
  { pref: '京都府', type: 'direct', person: '40代 女性', car: 'フォルクスワーゲン ポロ', price: '¥1,280,000', voice: '輸入車も買い手が見つかりました。', car_e: '🚗', face_e: '👩' },
  { pref: '大阪府', type: 'loan', person: '20代 女性', car: 'スズキ スイフト', price: '¥980,000', voice: '低金利で初めてのマイカー購入。', car_e: '🚗', face_e: '👩' },
  { pref: '兵庫県', type: 'hikaku', person: '40代 男性', car: 'トヨタ ハイエース', price: '¥3,120,000', voice: '商用車も複数社比較で高値。', car_e: '🚐', face_e: '🧑' },
  { pref: '奈良県', type: 'kaitori', person: '30代 女性', car: 'ホンダ フィット', price: '¥1,050,000', voice: '手数料0円で気持ちよく売れました。', car_e: '🚗', face_e: '👩' },
  { pref: '和歌山県', type: 'direct', person: '50代 男性', car: '日産 ルークス', price: '¥1,180,000', voice: '地方でも全国の買い手に届きました。', car_e: '🚗', face_e: '🧔' },
  { pref: '鳥取県', type: 'loan', person: '30代 男性', car: 'ダイハツ ロッキー', price: '¥1,620,000', voice: '来店少なめでローン契約まで完結。', car_e: '🚙', face_e: '🧑' },
  { pref: '島根県', type: 'hikaku', person: '40代 男性', car: 'トヨタ ライズ', price: '¥1,540,000', voice: '比較して納得の価格で売却。', car_e: '🚙', face_e: '🧑' },
  { pref: '岡山県', type: 'kaitori', person: '60代 男性', car: 'トヨタ カローラ', price: '¥890,000', voice: '長く乗った一台、丁寧に査定。', car_e: '🚗', face_e: '👴' },
  { pref: '広島県', type: 'direct', person: '30代 男性', car: 'マツダ CX-5', price: '¥2,240,000', voice: '地元マツダ、全国に販売できました。', car_e: '🚙', face_e: '🧑' },
  { pref: '山口県', type: 'loan', person: '40代 女性', car: 'ホンダ N-WGN', price: '¥980,000', voice: '家計に合わせた支払いで購入。', car_e: '🚗', face_e: '👩' },
  { pref: '徳島県', type: 'hikaku', person: '50代 男性', car: 'スズキ ジムニー', price: '¥2,080,000', voice: '人気車、他社比較で最高額に。', car_e: '🚙', face_e: '🧔' },
  { pref: '香川県', type: 'kaitori', person: '30代 男性', car: '日産 ノート', price: '¥1,260,000', voice: 'スムーズに買取、翌日入金でした。', car_e: '🚗', face_e: '🧑' },
  { pref: '愛媛県', type: 'direct', person: '40代 女性', car: 'トヨタ パッソ', price: '¥720,000', voice: 'ダイレクト販売で相場に近い価格。', car_e: '🚗', face_e: '👩' },
  { pref: '高知県', type: 'loan', person: '20代 男性', car: 'スズキ アルト', price: '¥640,000', voice: '維持費も相談でき安心して購入。', car_e: '🚗', face_e: '👨' },
  { pref: '福岡県', type: 'hikaku', person: '40代 男性', car: 'トヨタ ノア', price: '¥2,460,000', voice: '複数社比較で20万円アップ。', car_e: '🚐', face_e: '🧑' },
  { pref: '佐賀県', type: 'kaitori', person: '50代 男性', car: 'ダイハツ タフト', price: '¥1,380,000', voice: '出張査定で手間なく売れました。', car_e: '🚙', face_e: '🧔' },
  { pref: '長崎県', type: 'direct', person: '30代 女性', car: 'ホンダ シャトル', price: '¥1,420,000', voice: '島しょ部でも対応してもらえました。', car_e: '🚗', face_e: '👩' },
  { pref: '熊本県', type: 'loan', person: '30代 男性', car: 'トヨタ ルーミー', price: '¥1,480,000', voice: '子育て世代向けプランで購入。', car_e: '🚐', face_e: '🧑' },
  { pref: '大分県', type: 'hikaku', person: '40代 男性', car: '日産 キックス', price: '¥1,980,000', voice: '他社より高評価、対応も早い。', car_e: '🚙', face_e: '🧑' },
  { pref: '宮崎県', type: 'kaitori', person: '60代 男性', car: 'スバル サンバー', price: '¥580,000', voice: '働くクルマもしっかり買取。', car_e: '🚐', face_e: '👴' },
  { pref: '鹿児島県', type: 'direct', person: '40代 女性', car: 'ホンダ フリード', price: '¥1,640,000', voice: '全国の買い手で早期成約。', car_e: '🚐', face_e: '👩' },
  { pref: '沖縄県', type: 'loan', person: '20代 女性', car: 'トヨタ パッソ', price: '¥760,000', voice: '離島でもローンでスムーズに購入。', car_e: '🚗', face_e: '👩' },
];

export function SaleResultsSlider({ items }: { items?: SaleItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const real = !!(items && items.length >= 3);
  const data = real ? (items as SaleItem[]) : SAMPLE;
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.9), behavior: 'smooth' });
  };

  return (
    <section className="bg-[#F5F9F8] px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-navy-800 sm:text-2xl">{real ? '最近の成約実績' : 'ご利用実績'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {real
                ? <>BUYMOで成約した車両の実績です。全国からご利用いただいています。</>
                : <>直接買取・ダイレクト販売・ローン購入・他社比較まで、<strong>全国47都道府県</strong>でご利用いただいています。<span className="ml-1 text-xs text-slate-400">※表示はイメージです</span></>}
            </p>
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button type="button" onClick={() => scrollBy(-1)} aria-label="前へ" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => scrollBy(1)} aria-label="次へ" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>

        <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.map((r, i) => {
            const t = TYPE_META[r.type];
            return (
              <article key={i} className="w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className={`relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br ${t.grad} text-5xl`}>
                  <span>{r.car_e}</span>
                  <span className="absolute -bottom-5 left-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-navy-50 text-2xl shadow">{r.face_e}</span>
                  <span className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-black shadow ${t.cls}`}>{t.label}</span>
                  <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-slate-600">{r.pref}</span>
                </div>
                <div className="space-y-1.5 p-4 pt-7">
                  <p className="text-xs font-bold text-slate-400">{r.person ? `${r.person}・${r.pref}` : r.pref}</p>
                  <p className="font-black text-navy-800">{r.car}</p>
                  <p className="text-lg font-black tabular-nums text-accent-600">{r.price}<span className="ml-1 text-xs font-bold text-slate-400">{t.suffix}</span></p>
                  {r.voice && <p className="flex gap-1 text-xs leading-relaxed text-slate-600"><Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />{r.voice}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
