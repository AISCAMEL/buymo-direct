import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendFormalAppraisalEmails } from '@/lib/email';

// 正式査定の申込（未ログインでも可）。AI査定の車両情報・概算額を引き継いで受け付ける。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    maker?: string;
    model?: string;
    year?: number;
    mileageKm?: number;
    condition?: string;
    prefecture?: string;
    name?: string;
    phone?: string;
    email?: string;
    preferredContact?: string;
    notes?: string;
    aiLow?: number;
    aiHigh?: number;
    // 詳細情報
    grade?: string;
    typeCode?: string;
    vin?: string;
    transmission?: string;
    fuel?: string;
    bodyType?: string;
    color?: string;
    shakenUntil?: string;
    repairDetail?: string;
    equipment?: string;
    oneOwner?: boolean;
    hasRecords?: boolean;
    nonSmoking?: boolean;
    diagnosis?: Record<string, string>;
    sellTiming?: string;
    photos?: { url?: string; caption?: string }[];
  };

  const maker = String(body.maker ?? '').trim();
  const model = String(body.model ?? '').trim();
  const year = Number(body.year);
  const mileageKm = Number(body.mileageKm);
  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const prefecture = String(body.prefecture ?? '').trim();
  const email = String(body.email ?? '').trim();

  if (!maker || !Number.isFinite(year) || !Number.isFinite(mileageKm)) {
    return NextResponse.json({ error: '車両情報を確認してください' }, { status: 400 });
  }
  if (!name || name.length > 100) return NextResponse.json({ error: 'お名前をご確認ください' }, { status: 400 });
  if (!phone || phone.length > 30) return NextResponse.json({ error: '電話番号をご確認ください' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスをご確認ください' }, { status: 400 });
  }

  // ログイン中ならユーザー紐付け
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* 未ログインでも可 */
  }

  const str = (v: unknown, max = 500) => {
    const s = String(v ?? '').trim();
    return s ? s.slice(0, max) : null;
  };
  // 写真配列を検証（{url, caption} のみ・最大20枚）
  const photos = Array.isArray(body.photos)
    ? body.photos
        .filter((p) => p && typeof p.url === 'string' && p.url.startsWith('http'))
        .slice(0, 20)
        .map((p) => ({ url: String(p.url), caption: p.caption ? String(p.caption).slice(0, 40) : null }))
    : [];

  // DB保存（service role・ベストエフォート）
  try {
    const service = createServiceClient();
    await service.from('appraisal_requests').insert({
      user_id: userId,
      maker,
      model: model || '(未指定)',
      year,
      mileage_km: mileageKm,
      prefecture: prefecture || '(未指定)',
      condition: String(body.condition ?? 'good'),
      notes: (String(body.notes ?? '').trim() || null),
      contact_name: name,
      contact_phone: phone,
      contact_email: email || null,
      preferred_contact: String(body.preferredContact ?? '').trim() || null,
      ai_price_low: Number.isFinite(Number(body.aiLow)) ? Number(body.aiLow) : null,
      ai_price_high: Number.isFinite(Number(body.aiHigh)) ? Number(body.aiHigh) : null,
      // 詳細情報
      grade: str(body.grade, 60),
      type_code: str(body.typeCode, 40),
      vin: str(body.vin, 40),
      transmission: str(body.transmission, 20),
      fuel: str(body.fuel, 20),
      body_type: str(body.bodyType, 20),
      color: str(body.color, 40),
      shaken_until: str(body.shakenUntil, 20),
      repair_detail: str(body.repairDetail, 1000),
      equipment: str(body.equipment, 2000),
      one_owner: !!body.oneOwner,
      has_records: !!body.hasRecords,
      non_smoking: !!body.nonSmoking,
      diagnosis: body.diagnosis && typeof body.diagnosis === 'object' ? body.diagnosis : {},
      sell_timing: str(body.sellTiming, 20),
      photos,
      source: 'valuation',
      status: 'pending',
    });
  } catch (err) {
    console.error('[appraisal] DB保存に失敗:', err instanceof Error ? err.message : err);
  }

  // 通知メール（ベストエフォート）
  try {
    await sendFormalAppraisalEmails({
      name,
      email: email || undefined,
      phone,
      vehicle: `${maker} ${model} ${year}年 / ${mileageKm.toLocaleString('ja-JP')}km`,
      aiLow: Number.isFinite(Number(body.aiLow)) ? Number(body.aiLow) : undefined,
      aiHigh: Number.isFinite(Number(body.aiHigh)) ? Number(body.aiHigh) : undefined,
    });
  } catch (err) {
    console.error('[appraisal] メール送信に失敗:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
