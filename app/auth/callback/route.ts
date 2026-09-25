import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** 戻り先をサイト内の安全なパスに正規化（二重エンコード対策＋オープンリダイレクト防止）。 */
function safeRedirect(raw: string | null): string {
  let v = raw ?? '/';
  // 二重エンコード（%252F など）を数回まで解く
  for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(v); i++) {
    try { v = decodeURIComponent(v); } catch { break; }
  }
  // サイト内の絶対パスのみ許可（//host や http:// は拒否）
  if (!v.startsWith('/') || v.startsWith('//')) return '/';
  return v;
}

// メール確認・マジックリンク・LINEログインのトークンをセッションに交換する。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const redirect = safeRedirect(searchParams.get('redirect'));

  const supabase = await createClient();

  // token_hash 方式（LINEログインのサーバー側マジックリンク検証／PKCE不要）
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${redirect}`);
  } else if (code) {
    // code 方式（メール確認・OAuthのPKCE）
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${redirect}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
