'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <AlertTriangle className="h-20 w-20 text-amber-300" />
      <div>
        <h1 className="text-xl font-black text-slate-700">エラーが発生しました</h1>
        <p className="mt-2 text-sm text-slate-500">
          一時的な問題の可能性があります。もう一度お試しください。
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-slate-300">ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary">
          <RotateCcw className="h-4 w-4" /> もう一度試す
        </button>
        <Link href="/" className="btn-outline">ホームへ戻る</Link>
      </div>
    </div>
  );
}
