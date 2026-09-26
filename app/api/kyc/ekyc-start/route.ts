import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getEkycSessionUrl } from '@/lib/ekyc';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kyc/ekyc-start
 *
 * ホスト型 eKYC セッションを開始する。
 * 認証必須。レスポンス: { url: string }
 *
 * Body (JSON):
 *   redirect_url?: string  — 認証完了後のリダイレクト先（省略時はデフォルト）
 */
export async function POST(req: NextRequest) {
  // 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { redirect_url?: string };

  // コールバック URL の組み立て
  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  // コールバック改ざん防止のワンタイムトークン（本人による自己承認を防ぐ）
  const callbackToken = crypto.randomUUID();
  const callbackUrl = `${origin}/api/kyc/ekyc-callback?token=${callbackToken}`;
  const redirectUrl = body.redirect_url ?? `${origin}/dashboard/kyc`;

  // TRUSTDOCK セッション URL 取得
  let sessionUrl: string;
  try {
    sessionUrl = await getEkycSessionUrl(user.id, callbackUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'セッション作成に失敗しました';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // セッション ID を URL から抽出（モック URL の場合は uuid を生成）
  const sessionId = extractSessionId(sessionUrl) ?? crypto.randomUUID();

  // kyc_verifications テーブルに pending セッションを記録
  const service = createServiceClient();
  await service.from('kyc_verifications').upsert(
    {
      id: sessionId,
      user_id: user.id,
      status: 'pending',
      redirect_url: redirectUrl,
      callback_token: callbackToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  return NextResponse.json({ url: sessionUrl });
}

/** TRUSTDOCK セッション URL から session_id を抽出するユーティリティ */
function extractSessionId(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    // TRUSTDOCK URL 形式: https://kyc.trustdock.io/sessions/<session_id>
    const parts = parsed.pathname.split('/');
    const idx = parts.indexOf('sessions');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    // クエリパラメータ形式にも対応
    return parsed.searchParams.get('session_id');
  } catch {
    return null;
  }
}
