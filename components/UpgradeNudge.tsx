import Link from 'next/link';
import { Crown, ArrowRight } from 'lucide-react';

/**
 * 無料会員（有料・加盟店・本部以外）へ表示する有料会員の誘致バナー。
 * 買取で“見えない・損する”を訴求し /membership へ誘導する。
 */
export function UpgradeNudge({ source = 'nudge', compact = false }: { source?: string; compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href={`/membership?from=${source}`}
        className="flex items-center justify-between gap-2 rounded-xl border border-gold-200 bg-gold-50 px-4 py-2.5 text-sm hover:bg-gold-100"
      >
        <span className="flex items-center gap-2 font-bold text-gold-700">
          <Crown className="h-4 w-4" /> 買取の相場・仕入れ情報を見る（有料会員）
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-gold-600" />
      </Link>
    );
  }
  return (
    <Link
      href={`/membership?from=${source}`}
      className="block rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-5 transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15">
          <Crown className="h-5 w-5 text-gold-600" />
        </span>
        <div className="min-w-0">
          <p className="font-black text-slate-800">買取で、もっと利益を。</p>
          <p className="mt-0.5 text-sm text-slate-600">
            無料のままでは<strong>買取相場・仕入れ情報・実践講座・コミュニティ</strong>は見られません。
            有料会員で“勝てる仕入れ”に。
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-gold-700">
            有料会員のご案内を見る <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
