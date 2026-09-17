import Link from 'next/link';
import { FlaskConical } from 'lucide-react';

const ROLES = [
  { href: '/demo/admin', label: '本部管理', color: 'bg-red-600' },
  { href: '/demo/dealer', label: '加盟店', color: 'bg-navy-600' },
  { href: '/demo/seller', label: '売主会員', color: 'bg-emerald-600' },
  { href: '/demo/buyer', label: '買主会員', color: 'bg-gold-600' },
];

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Demo mode banner */}
      <div className="sticky top-0 z-50 flex items-center gap-3 bg-amber-400 px-4 py-2 text-sm font-bold text-amber-900">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span>DEMO MODE — データはダミーです。DBへの保存は行われません。</span>
        <div className="ml-auto flex gap-2">
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href} className={`rounded px-2.5 py-1 text-xs text-white ${r.color} hover:opacity-90`}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
