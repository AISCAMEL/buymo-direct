/**
 * GET /api/alert-check
 *
 * 保存検索の新着アラートを送信するバッチ処理エンドポイント。
 * Vercel Cron / 外部スケジューラから定期的に叩く（毎日 8:00 JST）。
 *
 * 認証（いずれか一つでOK）:
 *  1. Vercel Cron が自動送信する Authorization: Bearer <CRON_SECRET>
 *  2. ヘッダー x-alert-secret: <ALERT_CRON_SECRET>
 *  3. クエリパラメータ ?secret=<ALERT_CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { applyListingFilters } from '@/lib/listingQuery';
import { sendEmail, emailLayout } from '@/lib/email';
import { searchHref, describeSearch } from '@/lib/search';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // ─── 認証 ───────────────────────────────────────────────────────────────
  const alertSecret = process.env.ALERT_CRON_SECRET;
  const cronSecret = process.env.CRON_SECRET; // Vercel が自動設定

  const authHeader = req.headers.get('authorization');
  const providedSecret =
    req.headers.get('x-alert-secret') ?? req.nextUrl.searchParams.get('secret');

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isManualCall = alertSecret && providedSecret === alertSecret;

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ─── サービスロールクライアント（RLS バイパス）─────────────────────────
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: 'Service client not configured' }, { status: 500 });
  }

  // ─── 全保存検索を取得 ──────────────────────────────────────────────────
  const { data: searches, error: fetchErr } = await supabase
    .from('saved_searches')
    .select('*')
    .order('last_checked_at', { ascending: true });

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const results: Array<{
    id: string;
    name: string;
    newCount: number;
    emailSent: boolean;
    emailSkipped?: boolean;
  }> = [];

  for (const search of searches ?? []) {
    const params = (search.params ?? {}) as Record<string, string>;

    // ─── last_checked_at 以降の新着件数をカウント ─────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQuery: any = supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('created_at', search.last_checked_at);

    countQuery = applyListingFilters(countQuery, params);
    const { count } = await countQuery;
    const newCount = count ?? 0;

    let emailSent = false;
    let emailSkipped = false;

    if (newCount > 0) {
      // ユーザーのメールアドレスを取得（auth.users, サービスロール必須）
      const { data: userData } = await supabase.auth.admin.getUserById(search.user_id);
      const email = userData?.user?.email;

      if (email) {
        const href = `${SITE_URL}${searchHref(params)}`;
        const desc = describeSearch(params);

        const html = emailLayout(
          `新着車両が ${newCount} 件あります`,
          `<p>保存した検索「<strong>${search.name}</strong>」（${desc}）に
            新着の車両が <strong>${newCount} 件</strong>あります。</p>
           <p style="margin-top:16px">
             <a href="${href}"
                style="display:inline-block;background:#1E3A5F;color:#fff;
                       padding:10px 22px;border-radius:6px;
                       text-decoration:none;font-weight:bold">
               新着を見る
             </a>
           </p>
           <p style="margin-top:12px;font-size:12px;color:#64748b">
             保存した検索の管理は
             <a href="${SITE_URL}/dashboard/searches">マイページ › 保存した検索</a>
             から行えます。
           </p>`
        );

        const result = await sendEmail({
          to: email,
          subject: `【BUYMO ダイレクト】新着 ${newCount} 件 — ${search.name}`,
          html,
        });

        emailSent = result.ok;
        emailSkipped = result.skipped ?? false;
      } else {
        emailSkipped = true;
      }
    }

    // ─── last_checked_at を更新 ────────────────────────────────────────
    await supabase
      .from('saved_searches')
      .update({ last_checked_at: now })
      .eq('id', search.id);

    results.push({ id: search.id, name: search.name, newCount, emailSent, emailSkipped });
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now,
    total: results.length,
    withNewListings: results.filter((r) => r.newCount > 0).length,
    emailsSent: results.filter((r) => r.emailSent).length,
    results,
  });
}
