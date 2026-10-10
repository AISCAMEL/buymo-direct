/**
 * GET /api/lead-campaign
 *
 * 無料登録（スキル/プロ）の加盟店リードへ、買取ビジネスのオファーを段階送信するバッチ。
 * 登録1か月後〜1年にかけて最大4回。買取加盟（business_kind=buyback か franchise 申込）に
 * 変わったリードは自動停止する。Vercel Cron から毎日実行。
 *
 * 認証（いずれか）: Authorization: Bearer <CRON_SECRET> / x-alert-secret / ?secret=<ALERT_CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import { sendEmail, emailLayout } from '@/lib/email';
import {
  OFFER_STEPS,
  CAMPAIGN_TARGET_WISHES,
  dueOfferIndex,
  isCampaignComplete,
} from '@/lib/lead-campaign';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me').replace(/\/$/, '');

type Lead = {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  business_type_wish: string | null;
  created_at: string;
  offers_sent: number;
};

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

  const { data, error } = await svc
    .from('dealer_leads')
    .select('id, user_id, email, name, business_type_wish, created_at, offers_sent')
    .eq('campaign_status', 'active')
    .in('business_type_wish', CAMPAIGN_TARGET_WISHES)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = (data ?? []) as Lead[];

  // 変換判定の下準備：リードに紐づくユーザーのうち、買取加盟に変わった人を特定。
  const userIds = [...new Set(leads.map((l) => l.user_id).filter(Boolean))] as string[];
  const buybackUsers = new Set<string>();
  if (userIds.length > 0) {
    const { data: profs } = await svc.from('profiles').select('id, business_kind').in('id', userIds);
    (profs ?? []).forEach((p: { id: string; business_kind: string | null }) => {
      if (p.business_kind === 'buyback') buybackUsers.add(p.id);
    });
    const { data: apps } = await svc.from('franchise_applications').select('user_id').in('user_id', userIds);
    (apps ?? []).forEach((a: { user_id: string | null }) => a.user_id && buybackUsers.add(a.user_id));
  }

  const now = Date.now();
  let sent = 0;
  let converted = 0;
  let done = 0;

  for (const lead of leads) {
    // 買取加盟に変わっていたら停止
    if (lead.user_id && buybackUsers.has(lead.user_id)) {
      await svc.from('dealer_leads').update({ campaign_status: 'converted', updated_at: new Date().toISOString() }).eq('id', lead.id);
      converted++;
      continue;
    }

    const idx = dueOfferIndex(lead.created_at, lead.offers_sent, now);
    if (idx === null) {
      // 送信すべき時期でない、または全て送信済み
      if (isCampaignComplete(lead.offers_sent)) {
        await svc.from('dealer_leads').update({ campaign_status: 'done', updated_at: new Date().toISOString() }).eq('id', lead.id);
        done++;
      }
      continue;
    }

    const step = OFFER_STEPS[idx];
    if (!step || !lead.email) continue;

    const cta = `${SITE_URL}${step.ctaPath}`;
    const bodyHtml =
      step.body.map((p) => `<p style="margin:0 0 12px;line-height:1.7">${p}</p>`).join('') +
      `<p style="margin:20px 0"><a href="${cta}" style="display:inline-block;background:#0F766E;color:#fff;padding:12px 20px;border-radius:8px;font-weight:bold;text-decoration:none">${step.ctaLabel}</a></p>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8">配信停止をご希望の場合はお手数ですがご返信ください。</p>`;

    try {
      await sendEmail({
        to: lead.email,
        subject: step.subject,
        html: emailLayout(step.heading, bodyHtml),
      });
      if (lead.user_id) {
        await createNotification(lead.user_id, 'system', step.heading, step.body[0], step.ctaPath);
      }
      const nextSent = lead.offers_sent + 1;
      await svc
        .from('dealer_leads')
        .update({
          offers_sent: nextSent,
          last_offer_at: new Date().toISOString(),
          campaign_status: isCampaignComplete(nextSent) ? 'done' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      sent++;
    } catch {
      /* 1件の失敗で全体を止めない */
    }
  }

  return NextResponse.json({ ok: true, sent, converted, done, scanned: leads.length });
}
