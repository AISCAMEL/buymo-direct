import { redirect } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { StoreQR } from '@/components/StoreQR';

export const dynamic = 'force-dynamic';

export default async function DealerQrPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/qr');
  const dealer = await getDealerForUser(user.id);
  if (!dealer) redirect('/dealer/register');

  const { data } = await supabase.from('dealers').select('name').eq('id', dealer.dealerId).maybeSingle();
  const storeName = (data as { name?: string } | null)?.name ?? '当店';

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="flex items-center gap-2 text-2xl font-black"><QrCode className="h-6 w-6 text-accent-600" /> 店舗QRコード</h1>
        <p className="text-sm text-slate-500">
          お客様がスマホで読み取ると、この店舗あてのヒアリングフォームが開きます（出張・来店査定で便利）。
          印刷して店頭・チラシに、PNGでWeb・SNSに使えます。
        </p>
      </div>
      <StoreQR dealerId={dealer.dealerId} storeName={storeName} />
    </div>
  );
}
