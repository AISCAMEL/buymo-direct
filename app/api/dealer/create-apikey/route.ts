import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser, generateApiKey } from '@/lib/dealer';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getDealerForUser(user.id);
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { plain, hash, prefix } = generateApiKey();

  const { error } = await supabase.from('dealer_api_keys').insert({
    dealer_id: ctx.dealerId,
    name: name.trim(),
    key_prefix: prefix,
    key_hash: hash,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plain });
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

  await supabase.from('dealer_api_keys').delete().eq('id', id).eq('dealer_id', ctx.dealerId);
  return NextResponse.json({ ok: true });
}
