import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Refreshes the Supabase auth session on every request and guards private routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 認証必須のパス
  const protectedPaths = ['/sell', '/dashboard', '/messages', '/escrow', '/admin', '/loan', '/dealer'];
  // 未ログインでも利用できる例外（正式査定の詳細入力など）
  const publicExceptions = ['/sell/appraisal'];
  const path = request.nextUrl.pathname;
  const needsAuth =
    protectedPaths.some((p) => path.startsWith(p)) && !publicExceptions.some((p) => path.startsWith(p));

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
