import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Returns service health status.
 * Used by Vercel health checks and external monitoring tools.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    },
    { status: 200 },
  );
}
