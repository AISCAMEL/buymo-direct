/**
 * GET /api/parts-watch-remind
 * ウォッチ中のパーツオークションが「24時間以内に終了」する場合、ウォッチしたユーザーへ通知する。
 * 日次 cron（/api/cron/daily）から呼ばれる。終了24h以内に入った出品を対象にするため、
 * 日次実行でも二重通知になりにくい。
 * 認証：Authorization: Bearer <CRON_SECRET> / x-alert-secret / ?secret=<ALERT_CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const alertSecret = process.env.ALERT_CRON_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const provided = req.headers.get('x-alert-secret') ?? req.nextUrl.searchParams.get('secret');
  const ok = (cronSecret && authHeader === `Bearer ${cronSecret}`) || (alertSecret && provided === alertSecret);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let svc: ReturnType<typeof createServiceClient>;
  try { svc = createServiceClient(); } catch { return NextResponse.json({ error: 'Service client not configured' }, { status: 500 }); }

  const now = Date.now();
  const in24h = new Date(now + 24 * 3600_000).toISOString();
  const nowIso = new Date(now).toISOString();

  // 24時間以内に終了する開催中の出品
  const { data: ending, error } = await svc
    .from('part_auctions')
    .select('id, title, current_price, ends_at')
    .eq('status', 'active')
    .gt('ends_at', nowIso)
    .lte('ends_at', in24h)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  for (const a of ending ?? []) {
    const { data: watchers } = await svc.from('part_watches').select('user_id').eq('auction_id', a.id);
    for (const w of watchers ?? []) {
      await createNotification(
        w.user_id as string,
        'system',
        'まもなく終了：ウォッチ中の商品',
        `「${a.title}」が24時間以内に終了します（現在 ¥${(a.current_price ?? 0).toLocaleString()}）。`,
        `/parts/${a.id}`,
      );
      notified++;
    }
  }

  return NextResponse.json({ ok: true, auctions: (ending ?? []).length, notified });
}
