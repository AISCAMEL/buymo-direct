/**
 * GET/POST /api/cron/generate-column
 *
 * AIコラムを1本生成して公開する。/api/cron/daily から毎日呼ばれる想定（1日1本）。
 * 認証：Vercel Cron の Authorization: Bearer <CRON_SECRET> / x-alert-secret / ?secret=
 *       または管理者ログイン（手動生成用）。
 * 冪等：当日すでに生成済みならスキップ（force=1 で強制生成）。
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { countTodayColumns } from '@/lib/columns-db';
import { generateAndSaveColumn } from '@/lib/column-generate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

async function authorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const alertSecret = process.env.ALERT_CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const provided = req.headers.get('x-alert-secret') ?? req.nextUrl.searchParams.get('secret');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (alertSecret && provided === alertSecret) return true;
  // 管理者による手動実行も許可
  return await isAdminUser();
}

async function handle(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!force) {
    const today = await countTodayColumns();
    if (today > 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: '本日はすでに生成済みです', today });
    }
  }

  const result = await generateAndSaveColumn();
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
