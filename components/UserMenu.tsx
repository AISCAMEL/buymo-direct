'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown, LayoutDashboard, Heart, MessageSquare, Star, Building2,
  ShieldAlert, LogOut, UserRound,
} from 'lucide-react';

type Props = {
  unreadCount: number;
  pendingReviews: number;
  pendingEscrows: number;
  isAdmin: boolean;
};

function Badge({ n, color }: { n: number; color: string }) {
  if (!n) return null;
  return (
    <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white ${color}`}>
      {n > 9 ? '9+' : n}
    </span>
  );
}

export function UserMenu({ unreadCount, pendingReviews, pendingEscrows, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = unreadCount + pendingReviews + pendingEscrows;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const item = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        aria-label="アカウントメニュー"
        aria-expanded={open}
      >
        <UserRound className="h-4 w-4" />
        <span className="hidden sm:inline">アカウント</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        {total > 0 && !open && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <Link href="/dashboard/listings" className={item} onClick={() => setOpen(false)}>
            <LayoutDashboard className="h-4 w-4 text-slate-400" /> マイページ
            <Badge n={pendingEscrows} color="bg-amber-500" />
          </Link>
          <Link href="/messages" className={item} onClick={() => setOpen(false)}>
            <MessageSquare className="h-4 w-4 text-slate-400" /> メッセージ
            <Badge n={unreadCount} color="bg-red-500" />
          </Link>
          <Link href="/dashboard/favorites" className={item} onClick={() => setOpen(false)}>
            <Heart className="h-4 w-4 text-slate-400" /> お気に入り
          </Link>
          <Link href="/dashboard/reviews" className={item} onClick={() => setOpen(false)}>
            <Star className="h-4 w-4 text-slate-400" /> 評価
            <Badge n={pendingReviews} color="bg-accent-500" />
          </Link>
          <Link href="/dealers" className={item} onClick={() => setOpen(false)}>
            <Building2 className="h-4 w-4 text-slate-400" /> 加盟店
          </Link>
          {isAdmin && (
            <Link href="/admin" className={`${item} text-accent-600`} onClick={() => setOpen(false)}>
              <ShieldAlert className="h-4 w-4 text-accent-500" /> 管理（本部）
            </Link>
          )}
          <div className="my-1 border-t border-slate-100" />
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-500 hover:bg-slate-100">
              <LogOut className="h-4 w-4 text-slate-400" /> ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
