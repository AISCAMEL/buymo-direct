'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setInfo('確認メールを送信しました。メール内のリンクから登録を完了してください。');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="text-center text-2xl font-black">
          {mode === 'signup' ? '無料会員登録' : 'ログイン'}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          {mode === 'signup' ? '出品・購入・メッセージにはアカウントが必要です' : 'おかえりなさい'}
        </p>

        {/* ── ソーシャルログイン ── */}
        <div className="mt-6">
          <SocialLoginButtons redirectPath={redirectTo} mode={mode} />
        </div>

        {/* ── 区切り ── */}
        <div className="my-5 flex items-center gap-3">
          <hr className="flex-1 border-slate-200" />
          <span className="text-xs font-bold text-slate-400">またはメールアドレスで</span>
          <hr className="flex-1 border-slate-200" />
        </div>

        {/* ── メールフォーム ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">表示名（ニックネーム）</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例：カーマニア太郎"
              />
            </div>
          )}
          <div>
            <label className="label">メールアドレス</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">パスワード</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          {info && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{info}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? '処理中…' : mode === 'signup' ? '登録する' : 'ログイン'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'signup' ? (
            <>すでにアカウントをお持ちですか？{' '}
              <Link href="/login" className="font-bold text-navy-400 hover:underline">ログイン</Link>
            </>
          ) : (
            <>アカウントをお持ちでない方は{' '}
              <Link href="/signup" className="font-bold text-navy-400 hover:underline">新規登録</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
