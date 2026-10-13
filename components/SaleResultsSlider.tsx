'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

type SaleResult = {
  person: string;   // 匿名の属性（例：40代 男性）
  area: string;     // エリア
  car: string;      // 車種
  price: string;    // 売却額（表示用）
  voice: string;    // ひとこと
  carEmoji: string;
  faceEmoji: string;
  grad: string;     // カバーのグラデーション
};

// 表示イメージ（サンプル）。実データ連携は後日。
const RESULTS: SaleResult[] = [
  { person: '40代 男性', area: '東京都', car: 'トヨタ アルファード', price: '¥3,280,000', voice: 'ディーラー下取りより40万円高く売れました。', carEmoji: '🚐', faceEmoji: '🧑', grad: 'from-navy-100 to-slate-200' },
  { person: '30代 女性', area: '神奈川県', car: 'ホンダ N-BOX', price: '¥1,120,000', voice: '写真を送るだけ。来店なしで完結して楽でした。', carEmoji: '🚗', faceEmoji: '👩', grad: 'from-rose-100 to-orange-100' },
  { person: '50代 男性', area: '大阪府', car: 'レクサス RX', price: '¥4,650,000', voice: '複数社の中でいちばん高い査定でした。', carEmoji: '🚙', faceEmoji: '🧔', grad: 'from-amber-100 to-yellow-100' },
  { person: '20代 男性', area: '福岡県', car: 'スズキ スイフト', price: '¥680,000', voice: '過走行でも値段がついて驚きました。', carEmoji: '🚗', faceEmoji: '👨', grad: 'from-emerald-100 to-teal-100' },
  { person: '60代 男性', area: '北海道', car: 'スバル フォレスター', price: '¥1,540,000', voice: '遠方でも出張で査定、陸送も手配してくれました。', carEmoji: '🚙', faceEmoji: '👴', grad: 'from-sky-100 to-blue-100' },
  { person: '30代 男性', area: '愛知県', car: '日産 セレナ', price: '¥1,860,000', voice: 'ローン残債ありでしたが差額もスムーズでした。', carEmoji: '🚐', faceEmoji: '🧑', grad: 'from-purple-100 to-indigo-100' },
  { person: '40代 女性', area: '兵庫県', car: 'トヨタ ヤリス', price: '¥1,340,000', voice: 'エスクローで入金まで安心して進められました。', carEmoji: '🚗', faceEmoji: '👩', grad: 'from-pink-100 to-rose-100' },
  { person: '50代 女性', area: '埼玉県', car: 'ホンダ ヴェゼル', price: '¥2,080,000', voice: '相場より高く、丁寧な対応で満足です。', carEmoji: '🚙', faceEmoji: '👩‍🦰', grad: 'from-teal-100 to-emerald-100' },
  { person: '30代 男性', area: '広島県', car: 'マツダ CX-5', price: '¥2,240,000', voice: '事故歴ありでも正直に査定してもらえました。', carEmoji: '🚙', faceEmoji: '👨', grad: 'from-orange-100 to-amber-100' },
  { person: '40代 男性', area: '宮城県', car: 'トヨタ プリウス', price: '¥1,760,000', voice: 'ハイブリッドの電池状態も評価してくれました。', carEmoji: '🚗', faceEmoji: '🧑', grad: 'from-lime-100 to-green-100' },
];

export function SaleResultsSlider() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.9), behavior: 'smooth' });
  };

  return (
    <section className="bg-[#F5F9F8] px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-navy-800 sm:text-2xl">売却実績</h2>
            <p className="mt-1 text-sm text-slate-500">全国のお客様に、相場に近い価格でお売りいただいています。<span className="ml-1 text-xs text-slate-400">※表示はイメージです</span></p>
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button type="button" onClick={() => scrollBy(-1)} aria-label="前へ" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => scrollBy(1)} aria-label="次へ" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>

        <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RESULTS.map((r, i) => (
            <article key={i} className="w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={`relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br ${r.grad} text-5xl`}>
                <span>{r.carEmoji}</span>
                <span className="absolute -bottom-5 left-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-navy-50 text-2xl shadow">{r.faceEmoji}</span>
                <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-slate-600">{r.area}</span>
              </div>
              <div className="space-y-1.5 p-4 pt-7">
                <p className="text-xs font-bold text-slate-400">{r.person}・{r.area}</p>
                <p className="font-black text-navy-800">{r.car}</p>
                <p className="text-lg font-black tabular-nums text-accent-600">{r.price}<span className="ml-1 text-xs font-bold text-slate-400">で売却</span></p>
                <p className="flex gap-1 text-xs leading-relaxed text-slate-600"><Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />{r.voice}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
