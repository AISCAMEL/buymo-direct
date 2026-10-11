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
    .select('id')
    .eq('status', 'active')
    .lte('ends_at', nowIso)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let closed = 0;
  for (const a of data ?? []) {
    // reserve 反映の確定処理（SECURITY DEFINER 関数）
    const { data: r } = await svc.rpc('close_part_auction', { p_auction_id: a.id });
    const res = (r ?? {}) as {
      ok?: boolean; noop?: boolean; sold?: boolean; winner_id?: string | null;
      seller_id?: string; title?: string; price?: number; reserve_missed?: boolean;
    };
    if (!res.ok || res.noop) continue;
    closed++;
    const amt = `¥${(res.price ?? 0).toLocaleString()}`;
    const title = res.title ?? '出品商品';
    if (res.sold && res.winner_id) {
      await createNotification(res.winner_id, 'system', '落札しました', `「${title}」を ${amt} で落札しました。`, `/parts/${a.id}`);
      if (res.seller_id) await createNotification(res.seller_id, 'system', '落札されました', `「${title}」が ${amt} で落札されました。`, `/parts/${a.id}`);
    } else if (res.reserve_missed && res.seller_id) {
      await createNotification(res.seller_id, 'system', '最低落札価格に未達で終了', `「${title}」は最低落札価格に届かず、落札なしで終了しました。`, `/parts/${a.id}`);
    }
  }

  return NextResponse.json({ ok: true, closed });
}
