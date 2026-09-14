'use client';

import { useState } from 'react';
import { Camera, MessageSquare, ShieldCheck, Car, Search, Heart, Lock, CheckCircle2 } from 'lucide-react';

const SELL_STEPS = [
  {
    icon: Camera,
    step: '01',
    title: '写真・情報を入力して出品',
    desc: '車両の写真を撮影し、年式・走行距離・価格などを入力。最短10分で出品完了。',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: '購入希望者からメッセージ',
    desc: '興味を持ったバイヤーから直接メッセージが届きます。条件を話し合って合意へ。',
  },
  {
    icon: ShieldCheck,
    step: '03',
    title: 'エスクロー入金を確認',
    desc: 'バイヤーがエスクロー口座へ入金。入金確認後に車両を安心して引き渡します。',
  },
  {
    icon: Car,
    step: '04',
    title: '車両を引き渡して売上を受け取る',
    desc: '現車確認・引き渡し後、売上金がお手元に振り込まれます。',
  },
];

const BUY_STEPS = [
  {
    icon: Search,
    step: '01',
    title: '気になる車を検索・お気に入り',
    desc: 'メーカー・車種・価格帯・走行距離で絞り込み。気になる車をお気に入りに追加。',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: '出品者へメッセージで交渉',
    desc: '出品者と直接やり取り。価格交渉・試乗・現車確認の日程も柔軟に相談できます。',
  },
  {
    icon: Lock,
    step: '03',
    title: 'エスクローに安全入金',
    desc: '代金は第三者機関が保全。詐欺・未着リスクなく安心して取引できます。',
  },
  {
    icon: CheckCircle2,
    step: '04',
    title: '現車確認後に受け取り完了',
    desc: '車両を確認・受け取り後に承認するまで売主に代金は届きません。完全に安心。',
  },
];

export function HowItWorksTabs() {
  const [tab, setTab] = useState<'sell' | 'buy'>('sell');
  const steps = tab === 'sell' ? SELL_STEPS : BUY_STEPS;

  return (
    <div>
      {/* Tab switcher */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full bg-navy-600 p-1">
          {(['sell', 'buy'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-8 py-2 text-sm font-bold transition-all ${
                tab === t
                  ? 'bg-accent-500 text-white shadow-md'
                  : 'text-navy-200 hover:text-white'
              }`}
            >
              {t === 'sell' ? '売る' : '買う'}
            </button>
          ))}
        </div>
      </div>

      {/* Step cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, step, title, desc }) => (
          <div key={step} className="rounded-xl border border-white/10 bg-navy-600 p-6">
            <span className="mb-4 block text-3xl font-black text-white/20">{step}</span>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/20">
              <Icon className="h-5 w-5 text-accent-500" />
            </div>
            <h3 className="mb-2 text-sm font-bold leading-snug text-white">{title}</h3>
            <p className="text-xs leading-relaxed text-navy-200">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
