import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { DealerHelpAI } from '@/components/DealerHelpAI';
import { DealerNav } from '@/components/DealerNav';

export const dynamic = 'force-dynamic';

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/dashboard');

  const ctx = await getDealerForUser(user.id);

  // 未登録の場合は登録ページへ（register 自体はそのまま表示）
  if (!ctx) {
    return <>{children}</>;
  }

  const { data: dealer } = await supabase
    .from('dealers')
    .select('name, status')
    .eq('id', ctx.dealerId)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-navy-700 px-5 py-3 text-white">
        <Building2 className="h-5 w-5 text-accent-500" />
        <div>
          <span className="font-black">{dealer?.name ?? '加盟店管理'}</span>
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs uppercase">{ctx.role}</span>
        </div>
        {dealer?.status === 'pending' && (
          <span className="ml-auto rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-white">審査中</span>
        )}
        {dealer?.status === 'suspended' && (
          <span className="ml-auto rounded-full bg-red-500 px-3 py-0.5 text-xs font-bold text-white">停止中</span>
        )}
      </div>

      <DealerNav />

      {children}

      {/* わからないことをその場で聞けるヘルプAI（全加盟店ページ常設） */}
      <DealerHelpAI dealerName={dealer?.name ?? undefined} role={ctx.role} />
    </div>
  );
}
