import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markAllRead } from '@/lib/notifications';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate that the requested userId matches the authenticated user
  const body = await req.json().catch(() => ({}));
  if (body.userId && body.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await markAllRead(user.id);
  return NextResponse.json({ ok: true });
}
