import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // ── www → non-www redirect ────────────────────────────────────────────────
  // Only redirect when NEXT_PUBLIC_SITE_URL is configured without "www."
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && hostname.startsWith('www.')) {
    const canonical = new URL(siteUrl);
    if (!canonical.hostname.startsWith('www.')) {
      const target = new URL(request.url);
      target.hostname = canonical.hostname;
      return NextResponse.redirect(target, { status: 301 });
    }
  }

  // ── Supabase session refresh ──────────────────────────────────────────────
  const response = await updateSession(request);

  // ── Rate-limit hint header on API routes ─────────────────────────────────
  // The actual enforcement is handled by Vercel Edge / upstream; this header
  // communicates the limit to clients and monitoring tools.
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', '100');
  }

  return response;
}

export const config = {
  matcher: [
    // 静的アセットと画像最適化以外の全パス
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
