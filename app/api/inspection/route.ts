import { NextResponse } from 'next/server';
import { resolveActor, listSheets, createSheet } from '@/lib/inspection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const sheets = await listSheets(actor);
  return NextResponse.json({ sheets, scope: actor.scope });
}

export async function POST(req: Request) {
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const res = await createSheet(actor, {
    listing_id: (body.listing_id as string) ?? null,
    maker: (body.maker as string) ?? null,
    model: (body.model as string) ?? null,
    model_year: body.model_year != null ? Number(body.model_year) : null,
    mileage_km: body.mileage_km != null ? Number(body.mileage_km) : null,
    plate: (body.plate as string) ?? null,
    customer_name: (body.customer_name as string) ?? null,
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: res.id });
}
