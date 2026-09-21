import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// 査定 → ダイレクト出品への移行を記録（appraisal に listing_id / converted_at を紐付け）。
export async function POST(req: Request) {
  const { appraisalId, listingId } = (await req.json().catch(() => ({}))) as {
    appraisalId?: string;
    listingId?: string;
  };
  if (!appraisalId || !listingId) {
    return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
  }

  // ログイン必須。作成した出品が本人のものであることを確認。
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing || (listing as { seller_id: string }).seller_id !== user.id) {
    return NextResponse.json({ error: '対象の出品が見つかりません' }, { status: 403 });
  }

  try {
    const service = createServiceClient();
    await service
      .from('appraisal_requests')
      .update({ listing_id: listingId, converted_at: new Date().toISOString() })
      .eq('id', appraisalId);
  } catch (err) {
    console.error('[appraisal/convert] 失敗:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
