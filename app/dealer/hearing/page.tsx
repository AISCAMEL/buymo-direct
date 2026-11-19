import { redirect } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { listHearing } from '@/lib/hearing';
import { HearingList } from '@/components/HearingList';

export const dynamic = 'force-dynamic';

export default async function DealerHearingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/hearing');
  const dealer = await getDealerForUser(user.id);
  const sheets = dealer ? await listHearing(dealer.dealerId) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><ClipboardList className="h-6 w-6 text-accent-600" /> ヒアリング（出張・来店査定）</h1>
        <p className="text-sm text-slate-500">自店のQR・ヒアリングフォームから届いた聞き取り内容です。紙記入用は /hearing/print。</p>
      </div>
      <HearingList sheets={sheets} />
    </div>
  );
}
