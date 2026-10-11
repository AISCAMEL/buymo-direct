/**
 * GET /api/cron/daily
 *
 * 日次の定期バッチをまとめて実行する統合エンドポイント。
 * Vercel Hobby プランは Cron を「1日1回・少数」に制限しているため、
 * 個別の定期処理（保存検索アラート・見学前日リマインド・買取オファー・
 * パーツオークション確定）を本エンドポイントから順に呼び出す。
 *
 * 認証：Vercel Cron の Authorization: Bearer <CRON_SECRET>、
 *       または x-alert-secret / ?secret=<ALERT_CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const TASKS = [
  '/api/alert-check',
  '/api/appointment-reminders',
  '/api/lead-campaign',
  '/api/parts-auction-close',
  '/api/parts-watch-remind',
];

export async function GET(req: NextRequest) {
  const alertSecret = process.env.ALERT_CRON_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const provided = req.headers.get('x-alert-secret') ?? req.nextUrl.searchParams.get('secret');
  const ok = (cronSecret && authHeader === `Bearer ${cronSecret}`) || (alertSecret && provided === alertSecret);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const origin = req.nextUrl.origin;
  // 各サブタスクを同じ認証で順次呼び出す（1件の失敗で全体を止めない）。
  const headers: Record<string, string> = {};
  if (cronSecret) headers['authorization'] = `Bearer ${cronSecret}`;
  else if (alertSecret) headers['x-alert-secret'] = alertSecret;

  const results: Record<string, unknown> = {};
  for (const path of TASKS) {
    try {
      const res = await fetch(`${origin}${path}`, { headers, cache: 'no-store' });
      results[path] = { status: res.status, body: await res.json().catch(() => null) };
    } catch (e) {
      results[path] = { error: e instanceof Error ? e.message : 'failed' };
    }
  }

  return NextResponse.json({ ok: true, ran: TASKS.length, results });
}
