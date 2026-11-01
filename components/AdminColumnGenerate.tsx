'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Sparkles, ExternalLink } from 'lucide-react';

type Result =
  | { ok: true; slug: string; title: string; hadImage: boolean }
  | { ok: false; reason: string }
  | { ok: true; skipped: true; reason: string };

export function AdminColumnGenerate({ aiOn }: { aiOn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function generate() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/cron/generate-column?force=1', { method: 'POST' });
      const data = (await res.json()) as Result;
      setResult(data);
      if ('ok' in data && data.ok) router.refresh();
    } catch {
      setResult({ ok: false, reason: '通信に失敗しました' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold">今すぐ記事を生成</h2>
      <p className="mt-1 text-sm text-slate-500">
        AIが最新情報を調べてコラムを1本執筆し、画像をつけて公開します（通常は毎日自動で1本）。
      </p>
      {!aiOn && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          ANTHROPIC_API_KEY が未設定のため生成できません。Vercelの環境変数に設定してください。
        </p>
      )}
      <button onClick={generate} disabled={busy || !aiOn} className="btn-accent mt-3 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 今すぐ1本生成する
      </button>

      {result && (
        <div className="mt-3 text-sm">
          {'ok' in result && result.ok && 'skipped' in result ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{result.reason}</p>
          ) : 'ok' in result && result.ok ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
              <p className="font-bold">生成しました：{result.title}</p>
              <p className="mt-0.5 text-xs">画像：{result.hadImage ? 'あり' : 'なし（記事は公開済み）'}</p>
              <Link href={`/column/${result.slug}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> 記事を見る
              </Link>
            </div>
          ) : (
            <p className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700">{(result as { reason: string }).reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
