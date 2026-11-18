import { NextResponse } from 'next/server';
import { resolveActor, getSheet, updateSheet, deleteSheet, canAccess } from '@/lib/inspection';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

async function loadForActor(id: string) {
  const actor = await resolveActor();
  if (!actor) return { error: NextResponse.json({ error: '権限がありません' }, { status: 403 }) };
  const sheet = await getSheet(id);
  if (!sheet) return { error: NextResponse.json({ error: '見つかりません' }, { status: 404 }) };
  if (!canAccess(actor, sheet)) return { error: NextResponse.json({ error: '権限がありません' }, { status: 403 }) };
  return { actor, sheet };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadForActor(id);
  if (r.error) return r.error;
  return NextResponse.json({ sheet: r.sheet });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadForActor(id);
  if (r.error) return r.error;
  const patch = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const res = await updateSheet(id, patch);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadForActor(id);
  if (r.error) return r.error;
  const res = await deleteSheet(id);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
