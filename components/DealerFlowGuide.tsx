'use client';

import Link from 'next/link';
import { Sparkles, LifeBuoy, ArrowRight, HandCoins } from 'lucide-react';

// 成約から現金化までを「1本の流れ」で示すガイド。
// 各ステップは実際の画面に直結。困ったとき・次の一手はAIヘルプを開く。
const STEPS: { n: string; title: string; desc: string; href: string }[] = [
  { n: '1', title: '受注・対応', desc: 'お客様の案件を受けて対応を進める', href: '/dealer/cases' },
  { n: '2', title: '査定・見積', desc: '査定表で状態を記録し、見積書を作成', href: '/dealer/quotes' },
  { n: '3', title: '成約・納車', desc: '条件を確定し、引取り／納車を手配', href: '/dealer/cases' },
  { n: '4', title: '請求・入金（現金化）', desc: '請求書を発行し、入金・精算で現金化', href: '/dealer/invoices' },
];

function openHelp(seed?: string) {
  try {
    window.dispatchEvent(new CustomEvent('buymo:dealer-help', { detail: { seed } }));
  } catch { /* noop */ }
}

export function DealerFlowGuide() {
  return (
    <div className="rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-black text-navy-800">
          <HandCoins className="h-5 w-5 text-accent-600" /> やることナビ：成約から現金化までの流れ
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => openHelp('いまの状況で、次にやるべきことを1つだけ教えてください。')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-700"
          >
            <Sparkles className="h-3.5 w-3.5" />次の一手をAIに聞く
          </button>
          <button
            onClick={() => openHelp('困っています。うまくいかないときの対処を教えてください。')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <LifeBuoy className="h-3.5 w-3.5" />困ったとき
          </button>
        </div>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.n}>
            <Link
              href={s.href}
              className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition hover:border-accent-400 hover:shadow-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-600 text-xs font-black text-white">{s.n}</span>
                <span className="font-bold text-navy-800">{s.title}</span>
                {i < STEPS.length - 1 && <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" />}
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{s.desc}</p>
              <span className="mt-2 text-xs font-bold text-accent-600 group-hover:underline">開く →</span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-2 text-[11px] text-slate-400">
        迷ったら「次の一手をAIに聞く」。不具合やうまくいかないときは「困ったとき」を押すと、AIがその場で対処を案内します。
      </p>
    </div>
  );
}
