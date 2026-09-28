import { ShieldAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl bg-navy-700 px-5 py-3 text-white">
        <ShieldAlert className="h-5 w-5 text-accent-500" />
        <span className="font-black">運営管理コンソール</span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs">ADMIN</span>
      </div>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6">
        <aside className="mb-2 lg:mb-0">
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
