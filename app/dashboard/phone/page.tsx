import { redirect } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PhoneVerificationForm } from '@/components/PhoneVerificationForm';

export const dynamic = 'force-dynamic';

export default async function PhonePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/phone');

  const { data: profile } = await supabase.from('profiles').select('phone, phone_verified_at').eq('id', user.id).maybeSingle();
  const p = profile as { phone?: string | null; phone_verified_at?: string | null } | null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center gap-2">
        <Smartphone className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">電話番号認証</h1>
      </div>
      <p className="text-sm text-slate-500">
        電話番号を認証するとプロフィールに認証バッジが表示され、取引相手の信頼度が高まります。
      </p>
      <PhoneVerificationForm
        userId={user.id}
        currentPhone={p?.phone ?? null}
        isVerified={!!p?.phone_verified_at}
      />
    </div>
  );
}
