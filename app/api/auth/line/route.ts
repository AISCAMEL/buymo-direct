import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';
const CALLBACK_URL = `${SITE_URL}/api/auth/line/callback`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirect') ?? '/';

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.redirect(`${SITE_URL}/login?error=line_not_configured`);
  }

  const state = crypto.randomUUID();

  const lineUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineUrl.searchParams.set('response_type', 'code');
  lineUrl.searchParams.set('client_id', channelId);
  lineUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  lineUrl.searchParams.set('state', state);
  lineUrl.searchParams.set('scope', 'profile openid');

  const response = NextResponse.redirect(lineUrl.toString());
  response.cookies.set('line_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  response.cookies.set('line_oauth_redirect', redirectTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  return response;
}
