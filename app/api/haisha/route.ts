import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { calcHaishaPrice, calcHaishaRefund, type HaishaInput } from '@/lib/haisha';

// 廃車買取のお申し込み（未ログインでも可）。金額はサーバー側で再計算して保存する。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const email = String(body.email ?? '').trim();
  if (!name || name.length > 100) return NextResponse.json({ error: 'お名前をご確認ください' }, { status: 400 });
  if (!phone || phone.length > 30) return NextResponse.json({ error: '電話番号をご確認ください' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスをご確認ください' }, { status: 400 });
  }

  const dispIdx = Number(body.dispIdx);
  const input: HaishaInput = {
    pref: String(body.pref ?? ''),
    side: body.side ? String(body.side) : undefined,
    dispIdx: Number.isFinite(dispIdx) ? dispIdx : 0,
    mileage: body.mileage ? String(body.mileage) : undefined,
    run: body.run ? String(body.run) : undefined,
    key: body.key ? String(body.key) : undefined,
    shakenMonths: Number.isFinite(Number(body.shakenMonths)) ? Number(body.shakenMonths) : 0,
    rep: body.rep ? String(body.rep) : undefined,
    missing: Array.isArray(body.missing) ? (body.missing as unknown[]).map(String).slice(0, 12) : [],
    owner: body.owner ? String(body.owner) : undefined,
    matsu: body.matsu ? String(body.matsu) : undefined,
  };

  // サーバー側で再計算（クライアントの金額は信用しない）
  const price = calcHaishaPrice(input);
  const refund = calcHaishaRefund(input);

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* 未ログインでも可 */
  }

  const str = (v: unknown, max = 100) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : null; };
  const numOrNull = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

  try {
    const service = createServiceClient();
    await service.from('haisha_requests').insert({
      user_id: userId,
      maker: str(body.maker, 40),
      model: str(body.model, 60),
      year: numOrNull(body.year),
      body: str(body.body, 30),
      color: str(body.color, 30),
      pref: str(input.pref, 20),
      side: str(input.side, 20),
      disp_idx: input.dispIdx,
      mileage: str(input.mileage, 20),
      run_state: str(input.run, 20),
      key_state: str(input.key, 20),
      shaken_months: input.shakenMonths ?? 0,
      repaired: input.rep === 'yes',
      missing: input.missing ?? [],
      owner_type: str(input.owner, 20),
      matsu_type: str(input.matsu, 20),
      base_price: price.outOfTable ? null : price.base,
      offer_price: price.outOfTable ? null : price.offer,
      refund_total: refund.total,
      needs_assessment: price.blocked || price.outOfTable,
      contact_name: name,
      contact_phone: phone,
      contact_email: email || null,
      preferred_date: str(body.preferredDate, 20),
      notes: str(body.notes, 1000),
      status: 'pending',
    });
  } catch (err) {
    console.error('[haisha] DB保存に失敗:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({
    ok: true,
    offer: price.outOfTable ? null : price.offer,
    refund: refund.total,
    needsAssessment: price.blocked || price.outOfTable,
  });
}
