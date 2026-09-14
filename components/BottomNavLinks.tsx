'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, MessageSquare, LayoutDashboard } from 'lucide-react';

interface Props {
  unreadCount: number;
  userHref: string;
}

export function BottomNavLinks({ unreadCount, userHref }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/demo');
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  const activeClass = 'text-navy-600';
  const idleClass = 'text-slate-500 hover:text-navy-500';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white sm:hidden">
      {/* ホーム */}
      <Link
        href="/"
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${isActive('/') ? activeClass : idleClass}`}
      >
        <Home className="h-5 w-5" />
        <span className="text-[10px] font-bold">ホーム</span>
      </Link>

      {/* 検索 */}
      <Link
        href="/listings"
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${isActive('/listings') ? activeClass : idleClass}`}
      >
        <Search className="h-5 w-5" />
        <span className="text-[10px] font-bold">検索</span>
      </Link>

      {/* 出品 */}
      <Link
        href="/sell"
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-accent-600 hover:text-accent-700"
      >
        <PlusCircle className="h-6 w-6" />
        <span className="text-[10px] font-bold">出品</span>
      </Link>

      {/* メッセージ */}
      <Link
        href="/messages"
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 ${isActive('/messages') ? activeClass : idleClass}`}
      >
        <span className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span className="text-[10px] font-bold">メッセージ</span>
      </Link>

      {/* マイページ */}
      <Link
        href={userHref}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${isActive('/dashboard') ? activeClass : idleClass}`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span className="text-[10px] font-bold">マイページ</span>
      </Link>
    </nav>
  );
}
