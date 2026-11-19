import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin';
import { getDealerForUser } from '@/lib/dealer';
import { saveHearing, listHearing, type HearingData } from '@/lib/hearing';

export const dynamic = 'force-dynamic';

/** 同一オリジンからの送信か（簡易・外部からの悪用抑止）。 */
function sameOrigin(req: Request): boolean {
  try {
    const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? '';
    if (!origin) return true; // 直叩き以外は許容（ネイティブWebView等）
    const host = req.headers.get('x-forwarded-host') ?? new URL(req.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** 公開フォーム（QR）からのヒアリング送信。 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const customerName = String(b.customerName ?? '').trim();
  const tel = String(b.tel ?? '').trim();
  if (!customerName && !tel) {
    return NextResponse.json({ error: 'お名前または連絡先を入力してください' }, { status: 400 });
  }
  const num = (v: unknown) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

  const res = await saveHearing({
    dealerId: typeof b.dealerId === 'string' && b.dealerId ? b.dealerId : null,
    storeLabel: typeof b.storeLabel === 'string' ? b.storeLabel.slice(0, 80) : null,
    source: b.source === 'paper' ? 'paper' : 'web',
    customerName: customerName || null,
    tel: tel || null,
    maker: String(b.maker ?? '').trim() || null,
    model: String(b.model ?? '').trim() || null,
    modelYear: num(b.modelYear),
    mileageKm: num(b.mileageKm),
    plate: String(b.plate ?? '').trim() || null,
    hearing: (b.hearing && typeof b.hearing === 'object' ? b.hearing : {}) as HearingData,
    note: String(b.note ?? '').trim() || null,
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: res.id });
}

/** 管理/加盟店向け：ヒアリング一覧。 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  if (await isAdminUser()) {
    return NextResponse.json({ sheets: await listHearing(null) });
  }
  const dealer = await getDealerForUser(user.id);
  if (dealer) return NextResponse.json({ sheets: await listHearing(dealer.dealerId) });
  return NextResponse.json({ error: '権限がありません' }, { status: 403 });
}
