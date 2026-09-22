import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// 陸送のお申し込み（未ログインでも可）。ZERO手配前提でベストエフォート保存。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    fromPref?: string; toPref?: string; carSize?: string;
    estLow?: number; estHigh?: number;
    name?: string; phone?: string; email?: string; preferredDate?: string; notes?: string;
  };

  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const email = String(body.email ?? '').trim();
  if (!name || name.length > 100) return NextResponse.json({ error: 'お名前をご確認ください' }, { status: 400 });
  if (!phone || phone.length > 30) return NextResponse.json({ error: '電話番号をご確認ください' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスをご確認ください' }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch { /* 未ログインでも可 */ }

  const str = (v: unknown, max = 100) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : null; };
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

  try {
    const service = createServiceClient();
    await service.from('transport_requests').insert({
      user_id: userId,
      from_pref: str(body.fromPref, 20),
      to_pref: str(body.toPref, 20),
      car_size: str(body.carSize, 20),
      est_low: num(body.estLow),
      est_high: num(body.estHigh),
      preferred_date: str(body.preferredDate, 20),
      contact_name: name,
      contact_phone: phone,
      contact_email: email || null,
      notes: str(body.notes, 1000),
      status: 'pending',
    });
  } catch (err) {
    console.error('[transport] DB保存に失敗:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
