/**
 * GET /api/appointment-reminders
 *
 * 確定済みの見学・試乗で、開始が「約1日以内（かつ未来）」かつ未リマインドのものに、
 * 売り手・買い手の双方へ前日リマインド通知を送るバッチ処理。Vercel Cron から定期実行。
 *
 * 認証（いずれか一つでOK）:
 *  1. Vercel Cron の Authorization: Bearer <CRON_SECRET>
 *  2. ヘッダー x-alert-secret: <ALERT_CRON_SECRET>
 *  3. クエリ ?secret=<ALERT_CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import { formatDateTime } from '@/lib/format';
import { APPT_KIND_LABEL, type AppointmentKind } from '@/lib/appointments';

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

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const windowEnd = new Date(now + 30 * 60 * 60 * 1000).toISOString(); // 今から約30時間以内

  const { data, error } = await svc
    .from('appointments')
    .select('id, conversation_id, buyer_id, seller_id, kind, confirmed_slot')
    .eq('status', 'confirmed')
    .is('reminded_at', null)
    .gte('confirmed_slot', nowIso)
    .lte('confirmed_slot', windowEnd)
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let reminded = 0;
  for (const a of data ?? []) {
    const kindLabel = APPT_KIND_LABEL[(a.kind as AppointmentKind) ?? 'visit'];
    const when = formatDateTime(a.confirmed_slot as string);
    const title = `まもなく${kindLabel}の予定です`;
    const body = `${when} に${kindLabel}の予定があります。お忘れなくご準備ください。`;
    const link = `/messages/${a.conversation_id}`;
    try {
      await createNotification(a.buyer_id as string, 'message', title, body, link);
      await createNotification(a.seller_id as string, 'message', title, body, link);
      await svc.from('appointments').update({ reminded_at: new Date().toISOString() }).eq('id', a.id);
      reminded++;
    } catch {
      /* 1件の失敗で全体を止めない */
    }
  }

  return NextResponse.json({ ok: true, reminded });
}
