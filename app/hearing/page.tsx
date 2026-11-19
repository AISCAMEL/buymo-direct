import { HearingForm } from '@/components/HearingForm';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const metadata = { title: '査定ヒアリングシート' };

export default async function HearingPage({ searchParams }: { searchParams: Promise<{ d?: string; s?: string }> }) {
  const sp = await searchParams;
  const dealerId = typeof sp.d === 'string' ? sp.d : undefined;
  let storeLabel = typeof sp.s === 'string' ? sp.s : undefined;

  // 店舗IDが渡っていれば店名を補完（任意）
  if (dealerId && !storeLabel) {
    try {
      const svc = createServiceClient();
      const { data } = await svc.from('dealers').select('name').eq('id', dealerId).maybeSingle();
      storeLabel = (data as { name?: string } | null)?.name ?? undefined;
    } catch { /* noop */ }
  }

  return (
    <div className="px-4 py-6">
      <HearingForm dealerId={dealerId} storeLabel={storeLabel} />
    </div>
  );
}
