import { getViewerAccess } from '@/lib/viewer';
import { DashboardSidebar } from '@/components/DashboardSidebar';

export const dynamic = 'force-dynamic';

// マイページ（/dashboard/*）共通レイアウト：左サイドバーを常設して、
// アカウントメニューを開かなくても各機能へ移動できるようにする。
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewerAccess();

  // 未ログイン時は各ページ側でログインへリダイレクトされるため、サイドバーは出さない。
  if (!v.loggedIn) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <DashboardSidebar isDealer={v.isDealer} isAdmin={v.isAdmin} businessTrack={v.businessTrack} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
