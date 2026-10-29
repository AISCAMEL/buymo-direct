'use client';

// ルートレイアウト自体でエラーが起きた場合の最終フォールバック。
// global-error は独自に <html>/<body> を描画する必要がある。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: 'sans-serif', background: '#f8fafc', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#334155', margin: 0 }}>エラーが発生しました</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            一時的な問題の可能性があります。お手数ですが、もう一度お試しください。
          </p>
          {error.digest && <p style={{ fontSize: 12, color: '#cbd5e1', fontFamily: 'monospace', margin: 0 }}>ID: {error.digest}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={() => reset()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              もう一度試す
            </button>
            <a href="/" style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', color: '#334155', textDecoration: 'none', fontWeight: 700 }}>
              ホームへ戻る
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
