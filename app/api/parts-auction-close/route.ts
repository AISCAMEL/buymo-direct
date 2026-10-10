/**
 * GET /api/parts-auction-close
 * 終了時刻を過ぎたパーツオークションを確定し、落札者・出品者へ通知する。Vercel Cron（毎時）。
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
  try {
    svc = createServiceClient();
  } catch {
    return NextResponse.json({ error: 'Service client not configured' }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await svc
    .from('part_auctions')
    .select('id, title, seller_id, current_price, bid_count, highest_bidder_id')
    .eq('status', 'active')
    .lte('ends_at', nowIso)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let closed = 0;
  for (const a of data ?? []) {
    const sold = (a.bid_count ?? 0) > 0 && a.highest_bidder_id;
    const { error: upErr } = await svc
      .from('part_auctions')
      .update({
        status: sold ? 'sold' : 'ended',
        winner_id: sold ? a.highest_bidder_id : null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', a.id)
      .eq('status', 'active');
    if (upErr) continue;
    closed++;
    if (sold && a.highest_bidder_id) {
      const amt = `¥${(a.current_price ?? 0).toLocaleString()}`;
      await createNotification(a.highest_bidder_id as string, 'system', '落札しました', `「${a.title}」を ${amt} で落札しました。`, `/parts/${a.id}`);
      await createNotification(a.seller_id as string, 'system', '落札されました', `「${a.title}」が ${amt} で落札されました。`, `/parts/${a.id}`);
    }
  }

  return NextResponse.json({ ok: true, closed });
}
