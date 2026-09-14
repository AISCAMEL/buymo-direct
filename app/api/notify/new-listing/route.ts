import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendPushToUser } from '@/lib/push';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { listingId } = await req.json().catch(() => ({}));
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 });

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, seller_id, profiles(display_name)')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const serviceClient = createServiceClient();
  const { data: followers } = await serviceClient
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id);

  if (!followers?.length) return NextResponse.json({ ok: true, notified: 0 });

  const sellerName = (listing as any).profiles?.display_name ?? '出品者';
  await Promise.allSettled(
    followers.map((f) =>
      sendPushToUser(f.follower_id, {
        title: `${sellerName}さんが新しい車を出品しました`,
        body: listing.title,
        url: `/listings/${listing.id}`,
      })
    )
  );

  return NextResponse.json({ ok: true, notified: followers.length });
}
