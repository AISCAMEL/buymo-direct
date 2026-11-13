// 日次のAI監視自動点検。runAiMonitor を実行し、最新結果を app_settings に記録する。
// 認証：Bearer CRON_SECRET / x-alert-secret / ?secret=ALERT_CRON_SECRET、または管理者。
import { NextRequest, NextResponse } from 'next/server';
import { runAiMonitor } from '@/lib/monitor';
import { setAppSetting } from '@/lib/settings';
import { isAdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function authed(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const alertSecret = process.env.ALERT_CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const provided = req.headers.get('x-alert-secret') ?? req.nextUrl.searchParams.get('secret');
  return Boolean((cronSecret && authHeader === `Bearer ${cronSecret}`) || (alertSecret && provided === alertSecret));
}

export async function GET(req: NextRequest) {
  if (!authed(req) && !(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = await runAiMonitor();
  // 記録用に軽量化して保存（要対応・注意のみ）。
  const record = {
    status: report.status,
    counts: report.counts,
    generatedAt: report.generatedAt,
    actionable: report.alerts
      .filter((a) => a.severity !== 'ok')
      .map((a) => ({ label: a.label, count: a.count, severity: a.severity })),
  };
  try {
    await setAppSetting('monitor_last', JSON.stringify(record));
  } catch {
    /* 保存失敗は点検結果に影響させない */
  }

  return NextResponse.json({ ok: true, ...record });
}
