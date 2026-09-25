import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
const CALLBACK_URL = `${SITE_URL}/api/auth/line/callback`;

function getCookie(cookieHeader: string | null, name: string): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieHeader = request.headers.get('cookie');

  const storedState = getCookie(cookieHeader, 'line_oauth_state');
  const redirectTo = getCookie(cookieHeader, 'line_oauth_redirect') ?? '/';

  const clearCookies = (res: NextResponse) => {
    res.cookies.set('line_oauth_state', '', { maxAge: 0, path: '/' });
    res.cookies.set('line_oauth_redirect', '', { maxAge: 0, path: '/' });
    return res;
  };

  if (!code || !state || state !== storedState) {
    return clearCookies(NextResponse.redirect(`${SITE_URL}/login?error=line_state`));
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    return clearCookies(NextResponse.redirect(`${SITE_URL}/login?error=line_config`));
  }

  // 認可コードをアクセストークンに交換
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK_URL,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    return clearCookies(NextResponse.redirect(`${SITE_URL}/login?error=line_token`));
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return clearCookies(NextResponse.redirect(`${SITE_URL}/login?error=line_token`));
  }

  // LINEプロフィール取得
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    return clearCookies(NextResponse.redirect(`${SITE_URL}/login?error=line_profile`));
  }

  const profile = (await profileRes.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };

  // LINE user ID から決定論的なメールアドレスを生成（プロバイダーIDとして使用）
  const email = `line_${profile.userId}@line.noreply.buymo.me`;

  const service = createServiceClient();

  // ユーザーを作成（既存なら無視）
  await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      display_name: profile.displayName,
      avatar_url: profile.pictureUrl ?? null,
      provider: 'line',
    },
  });

  // マジックリンクを生成し、token_hash をサーバー側の /auth/callback で検証する。
  // （action_link を直接ブラウザで開くと PKCE/implicit の不一致でセッション化に失敗するため）
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    return clearCookies(NextResponse.redirect(`${SITE_URL}/login?error=line_auth`));
  }

  const verifyUrl = `${SITE_URL}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&redirect=${encodeURIComponent(redirectTo)}`;
  return clearCookies(NextResponse.redirect(verifyUrl));
}
