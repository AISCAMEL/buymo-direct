import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

/** GET /api/export/invoice/[id] — エスクロー取引の領収書 HTML を返す。 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select(
      '*, listings(title, maker, model, year), buyer:profiles!escrow_transactions_buyer_id_fkey(display_name), seller:profiles!escrow_transactions_seller_id_fkey(display_name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const listing = (tx as any).listings ?? {};
  const buyer = (tx as any).buyer ?? {};
  const seller = (tx as any).seller ?? {};
  const couponDiscount = (tx as any).coupon_discount ?? 0;
  const total = tx.amount + tx.escrow_fee + tx.title_fee + tx.installment_fee - couponDiscount;
  const date = tx.updated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const formatYen = (v: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(v);

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>領収書 #${id.slice(0, 8)} | BUYMO ダイレクト</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif; color: #1e293b; background: #f8fafc; }
    .page { max-width: 680px; margin: 40px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px; }
    .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #0f172a; }
    .logo span { color: #0F766E; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 28px; }
    .title-block h1 { font-size: 22px; font-weight: 800; margin-top: 12px; }
    .title-block p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .meta-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 4px; }
    .meta-item p { font-size: 15px; font-weight: 700; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; }
    td:last-child, th:last-child { text-align: right; }
    .total-row td { font-size: 17px; font-weight: 800; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 16px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    .party-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .party-card label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 6px; }
    .party-card p { font-size: 15px; font-weight: 700; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; margin: 24px auto 0; padding: 10px 24px; background: #0f172a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .btn-wrap { text-align: center; }
    @media print {
      body { background: #fff; }
      .page { border: none; box-shadow: none; margin: 0; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="title-block">
      <div class="logo">BUYMO<span> </span>ダイレクト</div>
      <h1>領収書 / 売買確認書</h1>
      <p>取引番号: ${id}</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:13px;color:#64748b;">発行日</p>
      <p style="font-weight:700;">${date}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <label>車両情報</label>
      <p>${[listing.maker, listing.model].filter(Boolean).join(' ')}${listing.year ? ` (${listing.year}年)` : ''}</p>
    </div>
    <div class="meta-item">
      <label>車両名</label>
      <p>${listing.title ?? '—'}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party-card">
      <label>買主</label>
      <p>${buyer.display_name ?? '—'}</p>
    </div>
    <div class="party-card">
      <label>売主</label>
      <p>${seller.display_name ?? '—'}</p>
    </div>
  </div>

  <h2>お支払い内訳</h2>
  <table>
    <thead>
      <tr><th>項目</th><th>金額</th></tr>
    </thead>
    <tbody>
      <tr><td>車両代金</td><td>${formatYen(tx.amount)}</td></tr>
      <tr><td>エスクロー手数料</td><td>${formatYen(tx.escrow_fee)}</td></tr>
      <tr><td>名義変更費</td><td>${tx.title_fee === 0 ? '—' : formatYen(tx.title_fee)}</td></tr>
      ${tx.installment_fee > 0 ? `<tr><td>クレジット分割手数料</td><td>${formatYen(tx.installment_fee)}</td></tr>` : ''}
      ${couponDiscount > 0 ? `<tr><td>クーポン割引</td><td>−${formatYen(couponDiscount)}</td></tr>` : ''}
    </tbody>
    <tfoot>
      <tr class="total-row"><td>合計（税込）</td><td>${formatYen(total)}</td></tr>
    </tfoot>
  </table>

  <p class="footer">
    本書は BUYMO ダイレクト マーケットプレイスが発行する電子領収書です。<br/>
    取引に関するお問い合わせは support@buymo.jp までご連絡ください。
  </p>

  <div class="btn-wrap no-print">
    <button class="print-btn" onclick="window.print()">
      🖨️ 印刷する / PDF保存
    </button>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
