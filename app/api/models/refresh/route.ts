import { NextResponse } from 'next/server';
import { refreshVehicleModels } from '@/lib/models';

// 車名マスタの自動更新（Vercel Cron または管理者が実行）。
// 認証: Vercel Cron の Authorization: Bearer <CRON_SECRET>、または ?secret=<MODELS_CRON_SECRET>
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET; // Vercel が自動設定
  const manualSecret = process.env.MODELS_CRON_SECRET ?? process.env.ALERT_CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const querySecret = new URL(req.url).searchParams.get('secret');

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isManual = manualSecret && querySecret === manualSecret;

  // どちらの秘密鍵も未設定の環境では実行を拒否（誤爆・乱用防止）
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await refreshVehicleModels();
  return NextResponse.json({ ok: true, ...result, refreshedAt: new Date().toISOString() });
}
