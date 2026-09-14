import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/dealer/dashboard', label: 'ダッシュボード' },
  { href: '/dealer/listings', label: '在庫管理' },
  { href: '/dealer/staff', label: 'スタッフ管理' },
  { href: '/dealer/analytics', label: 'アナリティクス' },
  { href: '/dealer/api-keys', label: 'API・Webhook' },
  { href: '/dealer/settings', label: '店舗設定' },
];

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

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            {n.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
