import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * プレミアム（会員限定）領域のゲート。
 * unlocked=true（有料会員・加盟店・本部）はそのまま表示。
 * それ以外は内容をぼかし、ログイン/加盟店希望フォームへの導線を重ねる。
 */
export function PremiumGate({
  unlocked,
  loggedIn = false,
  title = 'この先は会員限定です',
  note = '続きを見るには、ログインまたは加盟店（プロ）登録（無料）が必要です。',
  source = 'gate',
  children,
}: {
  unlocked: boolean;
  loggedIn?: boolean;
  title?: string;
  note?: string;
  source?: string;
  children: React.ReactNode;
}) {
  if (unlocked) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <div className="pointer-events-none select-none opacity-60 blur-[6px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75 p-4 text-center backdrop-blur-[2px]">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <Lock className="h-5 w-5 text-navy-600" />
        </span>
        <p className="font-black text-slate-800">{title}</p>
        <p className="max-w-xs text-xs text-slate-500">{note}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {!loggedIn && (
            <Link href={`/login?redirect=${encodeURIComponent('/join?source=' + source)}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              ログイン
            </Link>
          )}
          <Link href={`/join?source=${source}`} className="btn-accent">
            加盟店・プロ登録（無料）
          </Link>
        </div>
        <Link href="/join#plan" className="text-xs font-bold text-navy-500 underline">
          有料会員でできること →
        </Link>
      </div>
    </div>
  );
}
