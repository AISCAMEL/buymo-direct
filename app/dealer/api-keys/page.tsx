import { requireDealer } from '@/lib/dealer';
import { ApiKeysPanel } from './ApiKeysPanel';

export const dynamic = 'force-dynamic';

export default async function DealerApiKeysPage() {
  const { supabase, dealer } = await requireDealer() as any;
  const s = supabase as any;

  const { data: apiKeys } = await s
    .from('dealer_api_keys')
    .select('id, name, key_prefix, last_used_at, created_at')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });

  const { data: webhooks } = await s
    .from('dealer_webhooks')
    .select('id, url, events, active, secret, created_at')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at', { ascending: false });

  return (
    <ApiKeysPanel
      apiKeys={apiKeys ?? []}
      webhooks={webhooks ?? []}
      isOwner={dealer.isOwner}
    />
  );
}
