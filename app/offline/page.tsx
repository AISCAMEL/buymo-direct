'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="text-6xl">📵</div>
      <h1 className="text-2xl font-black text-navy-800">オフラインです</h1>
      <p className="text-slate-500">インターネット接続を確認してください。</p>
      <button
        onClick={() => window.location.reload()}
        className="btn-accent"
      >
        再試行する
      </button>
    </div>
  );
}
