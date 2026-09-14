import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** GET /api/export/transactions — 自分の取引履歴を CSV で返す。 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('escrow_transactions')
    .select('*, listings(title, maker, model)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const rows = (data ?? []) as any[];

  const STATUS_LABEL: Record<string, string> = {
    initiated: '取引開始',
    funds_held: '入金済み',
    inspection: '現車確認中',
    title_transfer: '名義変更中',
    completed: '完了',
    cancelled: 'キャンセル',
    disputed: '係争中',
  };

  const header = ['取引ID', '役割', '車両', '金額', '状態', '日付'];
  const csvRows = [
    header.join(','),
    ...rows.map((tx) => {
      const role = tx.buyer_id === user.id ? '買主' : '売主';
      const vehicle = [tx.listings?.maker, tx.listings?.model, tx.listings?.title]
        .filter(Boolean)
        .join(' ');
      const total = tx.amount + tx.escrow_fee + tx.title_fee + tx.installment_fee - (tx.coupon_discount ?? 0);
      return [
        tx.id,
        role,
        vehicle,
        total,
        STATUS_LABEL[tx.status] ?? tx.status,
        tx.updated_at?.slice(0, 10) ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    }),
  ].join('\r\n');

  return new NextResponse('﻿' + csvRows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="transactions.csv"`,
    },
  });
}
