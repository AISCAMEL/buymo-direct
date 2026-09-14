import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** GET /api/export/points — ポイント履歴を CSV で返す。 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await (supabase as any)
    .from('point_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as any[];

  const REASON_LABEL: Record<string, string> = {
    escrow_completed: '取引完了ボーナス',
    listing_sold: '成約ポイント',
    review_given: 'レビュー投稿',
    kyc_verified: '本人確認完了',
    phone_verified: '電話番号認証',
    referral: '友達紹介',
    coupon_use: 'クーポン使用',
    boost_use: 'ブースト使用',
  };

  let running = 0;
  const header = ['日付', '理由', '増減', '残高'];
  const csvRows = [
    header.join(','),
    ...rows.map((tx) => {
      running += tx.amount as number;
      return [
        tx.created_at?.slice(0, 10) ?? '',
        REASON_LABEL[tx.reason] ?? tx.reason,
        tx.amount,
        running,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    }),
  ].join('\r\n');

  return new NextResponse('﻿' + csvRows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="points.csv"`,
    },
  });
}
