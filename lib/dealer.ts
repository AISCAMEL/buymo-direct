import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';

export type DealerContext = {
  dealerId: string;
  role: 'owner' | 'manager' | 'staff';
  isOwner: boolean;
};

/** 加盟店スタッフか確認。未認証 or 非スタッフは redirect。 */
export async function requireDealer(): Promise<{ supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never; user: { id: string }; dealer: DealerContext }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/dashboard');

  // dealer_staff か dealer.owner_id で確認
  const { data: staffRow } = await supabase
    .from('dealer_staff')
    .select('dealer_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffRow) {
    return {
      supabase: supabase as any,
      user,
      dealer: { dealerId: staffRow.dealer_id, role: staffRow.role as any, isOwner: staffRow.role === 'owner' },
    };
  }

  // オーナーとして登録されているか確認
  const { data: dealerRow } = await supabase
    .from('dealers')
    .select('id, status')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (dealerRow) {
    return {
      supabase: supabase as any,
      user,
      dealer: { dealerId: dealerRow.id, role: 'owner', isOwner: true },
    };
  }

  redirect('/dealer');
}

/** 現在のユーザーが加盟店スタッフ or オーナーかどうかを返す（リダイレクトなし）。 */
export async function getDealerForUser(userId: string): Promise<DealerContext | null> {
  const supabase = await createClient();

  const { data: staffRow } = await supabase
    .from('dealer_staff')
    .select('dealer_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (staffRow) {
    return { dealerId: staffRow.dealer_id, role: staffRow.role as any, isOwner: staffRow.role === 'owner' };
  }

  const { data: dealerRow } = await supabase
    .from('dealers')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (dealerRow) {
    return { dealerId: dealerRow.id, role: 'owner', isOwner: true };
  }

  return null;
}

/** API キーを生成して返す（平文は一度限り）。保存は key_hash のみ。 */
export function generateApiKey(): { plain: string; hash: string; prefix: string } {
  const plain = 'bmc_' + crypto.randomBytes(28).toString('hex');
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  const prefix = plain.slice(0, 12);
  return { plain, hash, prefix };
}

/** API キーを検証して dealer_id を返す（service role）。 */
export async function verifyApiKey(key: string): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('dealer_api_keys')
    .select('dealer_id, dealer_id(status)')
    .eq('key_hash', hash)
    .maybeSingle();
  if (!data) return null;
  // 最終使用日時を更新（fire-and-forget）
  supabase.from('dealer_api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', hash);
  return data.dealer_id as string;
}

/** Webhook ペイロードを HMAC-SHA256 で署名。 */
export function signWebhook(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** 加盟店の全 Webhook に通知（fire-and-forget）。 */
export async function dispatchWebhook(dealerId: string, event: string, data: object) {
  const supabase = createServiceClient();
  const { data: hooks } = await supabase
    .from('dealer_webhooks')
    .select('url, secret, events')
    .eq('dealer_id', dealerId)
    .eq('active', true);
  if (!hooks?.length) return;

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    hooks
      .filter((h) => h.events.includes(event) || h.events.includes('*'))
      .map((h) =>
        fetch(h.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-BUYMO-Signature': signWebhook(payload, h.secret),
            'X-BUYMO-Event': event,
          },
          body: payload,
        }).catch(() => {/* fire-and-forget */})
      )
  );
}
