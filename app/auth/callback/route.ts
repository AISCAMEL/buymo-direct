import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import { grantPersonalCoupon } from '@/lib/coupons-grant';

/** 認証成功時にウェルカム¥2,000クーポンを冪等に付与する（会員1人につき1枚）。
 *  新規登録はもちろん、既存ユーザーも次回ログイン時に一度だけ受け取れる。
 *  失敗してもログイン自体は妨げない（ベストエフォート）。 */
async function grantWelcomeOnAuth(supabase: Awaited<ReturnType<typeof createClient>>): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const svc = createServiceClient();
    const res = await grantPersonalCoupon(svc, 'welcome', [user.id]);
    if (res.created && res.code) {
      await createNotification(
        user.id,
        'system',
        '🎁 ようこそ！¥2,000クーポンをプレゼント',
        `BUYMOダイレクトへのご登録ありがとうございます。初回のお取引で使える¥${res.value.toLocaleString()}クーポンです。クーポンコード：${res.code}（90日間有効・1回限り）`,
        '/listings',
      );
    }
  } catch {
    /* クーポン付与失敗は無視 */
  }
}

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
    if (!error) {
      await grantWelcomeOnAuth(supabase);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  } else if (code) {
    // code 方式（メール確認・OAuthのPKCE）
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await grantWelcomeOnAuth(supabase);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
