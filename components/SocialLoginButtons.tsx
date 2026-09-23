'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Provider icons ──────────────────────────────────────────────────────────
function LineIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        fill="currentColor"
        d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
// ───────────────────────────────────────────────────────────────────────────

interface Props {
  /** Path to redirect after successful OAuth login (default: '/'). */
  redirectPath?: string;
  mode?: 'login' | 'signup';
}

/**
 * Google and LINE login buttons via Supabase OAuth.
 * LINE uses scopes: 'profile openid email'.
 * Configure providers in: Supabase Dashboard → Authentication → Providers.
 */
export function SocialLoginButtons({ redirectPath = '/', mode = 'login' }: Props) {
  const [loading, setLoading] = useState<'google' | 'line' | null>(null);

  async function handleOAuth(provider: 'google' | 'line') {
    setLoading(provider);

    // LINE は Supabase 標準プロバイダーではないため、独自の OAuth ルートへ遷移。
    if (provider === 'line') {
      window.location.href = `/api/auth/line?redirect=${encodeURIComponent(redirectPath)}`;
      return;
    }

    // Google は Supabase OAuth を使用。
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      // On success the browser navigates away; only reset on error.
      setLoading(null);
    }
  }

  const action = mode === 'signup' ? '登録' : 'ログイン';

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handleOAuth('line')}
        disabled={!!loading}
        className="btn w-full justify-center gap-2.5 bg-[#06C755] py-3 text-white hover:bg-[#05b34c] disabled:opacity-50"
      >
        {loading === 'line' ? <Spinner /> : <LineIcon />}
        LINEで{action}
      </button>
      <button
        type="button"
        onClick={() => handleOAuth('google')}
        disabled={!!loading}
        className="btn w-full justify-center gap-2.5 border border-slate-300 bg-white py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading === 'google' ? <Spinner /> : <GoogleIcon />}
        Googleで{action}
      </button>
    </div>
  );
}
