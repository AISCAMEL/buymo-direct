import Link from 'next/link';
import { Bot, ClipboardCheck, Banknote, Check } from 'lucide-react';

export type AppraisalStep = 'ai' | 'formal' | 'sell';

type StepDef = {
  key: AppraisalStep;
  n: number;
  title: string;
  desc: string;
  href?: string;
  Icon: typeof Bot;
};

const STEPS: StepDef[] = [
  { key: 'ai', n: 1, title: 'AI査定（無料）', desc: '登録不要。メーカー・年式などで概算をすぐ確認', href: '/listings/valuation', Icon: Bot },
  { key: 'formal', n: 2, title: '正式査定を申込', desc: '詳細＋写真を入力 → 担当が確定金額をご案内', href: '/sell/appraisal', Icon: ClipboardCheck },
  { key: 'sell', n: 3, title: '売却方法を選ぶ', desc: '「買取」で即現金化／「ダイレクト販売」で高く売る', Icon: Banknote },
];

/** 査定〜売却までの進め方（AI査定 → 正式査定 → 売却）を示すガイド。
 *  current で現在地をハイライトし、ユーザーが次に何をすればよいか分かるようにする。 */
export function AppraisalFlowSteps({ current }: { current: AppraisalStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2.5 text-sm font-black text-navy-800">査定〜売却までの進め方（3ステップ）</p>
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const state = active
            ? 'border-accent-400 bg-accent-50'
            : done
              ? 'border-navy-200 bg-navy-50'
              : 'border-slate-200 bg-slate-50';
          const badge = active
            ? 'bg-accent-500 text-white'
            : done
              ? 'bg-navy-500 text-white'
              : 'bg-slate-300 text-white';

          const inner = (
            <div className={`flex h-full flex-col rounded-xl border p-2.5 text-center transition ${state}`}>
              <div className="mb-1 flex items-center justify-center gap-1">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${badge}`}>
                  {done ? <Check className="h-3 w-3" /> : s.n}
                </span>
                {active && <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[9px] font-black text-white">今ここ</span>}
              </div>
              <s.Icon className={`mx-auto mb-1 h-4 w-4 ${active ? 'text-accent-600' : done ? 'text-navy-500' : 'text-slate-400'}`} />
              <p className="text-xs font-bold leading-tight text-navy-800">{s.title}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{s.desc}</p>
            </div>
          );

          // 現在地以外でリンク先があれば、そのステップへ移動できるようにする
          return (
            <li key={s.key} className="min-w-0">
              {s.href && !active ? (
                <Link href={s.href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-xl">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
