import Link from 'next/link';
import type { Metadata } from 'next';
import { Camera, Check, Sun, Crop, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import { PHOTO_GUIDE, APPRAISAL_PHOTO_GUIDE } from '@/lib/photo-guide';
import { SITE_BASE } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-static';

const BASE = SITE_BASE;

export const metadata: Metadata = {
  title: '車の写真の撮り方ガイド｜出品・査定で高く売るコツ',
  description: '中古車を出品・査定するときの写真の撮り方を解説。必要なアングル9カット、明るさ・背景・傷の撮り方のコツ、NG例まで。反応が上がる写真で高く売りましょう。',
  alternates: { canonical: `${BASE}/documents/pictures` },
  openGraph: { title: '車の写真の撮り方ガイド | BUYMO ダイレクト', description: '反応が上がる車の写真の撮り方を解説。', url: `${BASE}/documents/pictures`, type: 'article' },
};

const TIPS = [
  { icon: Sun, title: '明るい時間に屋外で', desc: '日中の明るい場所で。逆光を避け、太陽を背にして撮ると色が正確に写ります。' },
  { icon: Crop, title: '「全体」と「寄り」の両方', desc: '車全体が入る引きの写真と、気になる箇所の寄りの写真を組み合わせると状態が伝わります。' },
  { icon: Camera, title: '横向き・水平に', desc: 'スマホは横向きで、地面と水平に。車が画面いっぱいに入る距離から撮りましょう。' },
  { icon: Check, title: '背景はすっきり', desc: '生活感のある背景や映り込みは避け、車が主役になる場所で撮影します。' },
];

const NG = [
  '暗い・ブレている・逆光で色がわからない',
  '一部しか写っていない（全体像が不明）',
  '傷・へこみを隠している（後のトラブルの元）',
  'ナンバーや個人情報がそのまま大きく写っている',
];

export default function PicturesGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: '車の写真の撮り方',
            description: '中古車の出品・査定で反応が上がる写真の撮り方。',
            step: PHOTO_GUIDE.map((g, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: g.label,
              text: g.hint,
            })),
          }),
        }}
      />

      <Breadcrumbs
        items={[
          { name: 'ホーム', url: `${BASE}/` },
          { name: '写真の撮り方', url: `${BASE}/documents/pictures` },
        ]}
      />

      <div>
        <p className="text-xs font-black uppercase tracking-widest text-teal-600">photo guide</p>
        <h1 className="mt-1 text-3xl font-black">車の写真の撮り方ガイド</h1>
        <p className="mt-2 text-sm text-slate-600">
          写真は車の第一印象。良い写真は<strong>問い合わせ・成約率</strong>を大きく左右します。出品・査定で押さえたいアングルとコツをまとめました。
        </p>
      </div>

      {/* 撮影のコツ */}
      <section>
        <h2 className="mb-3 text-lg font-black text-navy-700">撮影の4つのコツ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card flex gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-navy-800">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 必要なアングル */}
      <section>
        <h2 className="mb-1 text-lg font-black text-navy-700">出品で撮りたい9カット</h2>
        <p className="mb-3 text-sm text-slate-500">この順番で撮ると、購入者に状態が伝わりやすくなります。先頭（フロント）が一覧のサムネイルになります。</p>
        <ol className="grid gap-2 sm:grid-cols-2">
          {PHOTO_GUIDE.map((g, i) => (
            <li key={g.label} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-500 text-xs font-black text-white">{i + 1}</span>
              <div>
                <p className="text-sm font-bold text-slate-800">{g.label}</p>
                <p className="text-xs text-slate-500">{g.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 査定でさらに役立つカット */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <h2 className="mb-1 text-base font-black text-navy-700">査定ではさらに詳しく</h2>
        <p className="mb-3 text-xs text-slate-500">より正確な査定額のために、次のカットもあると安心です（車検証など個人情報が写るものは出品には使いません）。</p>
        <div className="flex flex-wrap gap-1.5">
          {APPRAISAL_PHOTO_GUIDE.filter((g) => !PHOTO_GUIDE.some((p) => p.label === g.label)).map((g) => (
            <span key={g.label} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
              {g.label}
            </span>
          ))}
        </div>
      </section>

      {/* NG例 */}
      <section>
        <h2 className="mb-3 text-lg font-black text-navy-700">避けたいNG写真</h2>
        <ul className="space-y-1.5 rounded-xl bg-amber-50 p-4">
          {NG.map((n) => (
            <li key={n} className="flex gap-1.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{n}
            </li>
          ))}
        </ul>
      </section>

      {/* 関連導線 */}
      <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
        <FileText className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          出品時は <Link href="/documents/necessary" className="font-bold underline">必要書類案内</Link> もあわせてご確認ください。撮影した写真はそのまま出品・査定にお使いいただけます。
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link href="/sell" className="btn-accent inline-flex items-center gap-1">写真を撮って出品する <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/listings/valuation" className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">無料査定を試す</Link>
      </div>
    </div>
  );
}
