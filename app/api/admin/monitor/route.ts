// AI監視センターのレポートを返す（管理者のみ）。画面の「再点検」やcronから利用。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { runAiMonitor } from '@/lib/monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const report = await runAiMonitor();
  return NextResponse.json(report);
}
