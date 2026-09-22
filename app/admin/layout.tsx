import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/analytics', label: 'アナリティクス' },
  { href: '/admin/listings', label: '出品モデレーション' },
  { href: '/admin/escrow', label: '取引監視' },
  { href: '/admin/buyback', label: '買取保証審査' },
  { href: '/admin/appraisals', label: '査定依頼' },
  { href: '/admin/valuations', label: '査定履歴' },
  { href: '/admin/loans', label: 'ローン審査' },
  { href: '/admin/transport', label: '陸送申込' },
  { href: '/admin/messages', label: 'チャット監視' },
  { href: '/admin/contact', label: 'お問い合わせ' },
  { href: '/admin/reports', label: '通報' },
  { href: '/admin/announcements', label: 'お知らせ' },
  { href: '/admin/kyc', label: '本人確認審査' },
  { href: '/admin/coupons', label: 'クーポン管理' },
  { href: '/admin/dealers', label: '加盟店管理' },
  { href: '/admin/audit', label: '監査ログ' },
  { href: '/admin/settings', label: '料金設定' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl bg-navy-700 px-5 py-3 text-white">
        <ShieldAlert className="h-5 w-5 text-accent-500" />
        <span className="font-black">運営管理コンソール</span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs">ADMIN</span>
      </div>

      <nav className="flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            {n.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
