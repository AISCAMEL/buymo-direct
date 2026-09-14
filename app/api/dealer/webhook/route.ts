import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getDealerForUser(user.id);
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  const body = formData
    ? { url: String(formData.get('url') ?? ''), events: String(formData.get('events') ?? 'deal.completed') }
    : await req.json().catch(() => ({}));

  const { url, events } = body;
  if (!url?.startsWith('https://')) return NextResponse.json({ error: 'HTTPS URL required' }, { status: 400 });

  const eventList = typeof events === 'string'
    ? events.split(',').map((e: string) => e.trim()).filter(Boolean)
    : events ?? ['deal.completed'];

  const { error } = await supabase.from('dealer_webhooks').insert({
    dealer_id: ctx.dealerId,
    url,
    events: eventList,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // form submit の場合はリダイレクト
  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return new Response(null, { status: 303, headers: { Location: '/dealer/api-keys' } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getDealerForUser(user.id);
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('dealer_webhooks').delete().eq('id', id).eq('dealer_id', ctx.dealerId);

  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return new Response(null, { status: 303, headers: { Location: '/dealer/api-keys' } });
  }
  return NextResponse.json({ ok: true });
}
