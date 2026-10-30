'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldCheck, ExternalLink } from 'lucide-react';
import { recordBuyerConsent } from '@/app/escrow/report-actions';

const ITEMS = [
  { key: 'asis', label: '中古車は現状有姿での取引であり、経年・使用に伴う傷・消耗等があり得ることを理解しました。' },
  { key: 'remote', label: '遠隔取引のため、購入前に写真・質問・現車確認等で十分に確認することを理解しました。' },
  { key: 'policy', label: 'クレーム・返品対応ポリシー／キャンセルポリシー／利用規約の内容に同意します。' },
];

export function EscrowConsentGate({ escrowId }: { escrowId: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allChecked = ITEMS.every((i) => checked[i.key]);

  function agree() {
    if (!allChecked) return;
    setError(null);
    startTransition(async () => {
      const res = await recordBuyerConsent(escrowId);
      if (res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="card border-2 border-navy-300 bg-navy-50/40 p-6">
      <h2 className="flex items-center gap-1.5 font-black text-navy-800">
        <ShieldCheck className="h-5 w-5 text-navy-600" /> 購入前の重要事項の確認
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        安心してお取引いただくため、以下の内容をご確認・ご同意のうえ、お支払いへお進みください。同意内容は取引記録として保存されます。
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
        <Link href="/claims" target="_blank" className="inline-flex items-center gap-1 text-accent-600 hover:underline"><ExternalLink className="h-3 w-3" /> クレーム・返品対応ポリシー</Link>
        <Link href="/cancellation" target="_blank" className="inline-flex items-center gap-1 text-accent-600 hover:underline"><ExternalLink className="h-3 w-3" /> キャンセルポリシー</Link>
        <Link href="/terms" target="_blank" className="inline-flex items-center gap-1 text-accent-600 hover:underline"><ExternalLink className="h-3 w-3" /> 利用規約</Link>
      </div>

      <div className="mt-3 space-y-2">
        {ITEMS.map((i) => (
          <label key={i.key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              checked={!!checked[i.key]}
              onChange={(e) => setChecked((p) => ({ ...p, [i.key]: e.target.checked }))}
            />
            <span className="text-slate-700">{i.label}</span>
          </label>
        ))}
      </div>

      {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

      <button
        type="button"
        onClick={agree}
        disabled={!allChecked || pending}
        className="btn-accent mt-3 w-full py-3 text-base disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 同意して支払いへ進む
      </button>
      {!allChecked && <p className="mt-1 text-center text-xs text-slate-400">すべての項目にチェックすると進めます。</p>}
    </div>
  );
}
