import Link from 'next/link';
import { Car, PlusCircle, MessageSquare, LayoutDashboard, Heart, ShieldAlert, Star, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { unreadConversationIds } from '@/lib/unread';
import { pendingReviewCount } from '@/lib/pendingReviews';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import { NotificationBell } from '@/components/NotificationBell';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const unreadCount = user ? (await unreadConversationIds(supabase, user.id)).size : 0;
  const pendingReviews = user ? await pendingReviewCount(supabase, user.id) : 0;

  const { count: pendingEscrows } = user
    ? await supabase
        .from('escrow_transactions')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .not('status', 'in', '(completed,cancelled,disputed)')
    : { count: 0 };

  let isAdmin = false;
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isAdmin = (prof as { role?: string } | null)?.role === 'admin';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-navy-500">
          <Car className="h-7 w-7" />
          <span className="text-lg font-black tracking-tight">
            BUYMO<span className="ml-1 align-middle rounded-md bg-navy-500 px-1.5 py-[3px] text-[11px] font-bold text-white">ダイレクト</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/listings" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
            車を探す
          </Link>
          <Link href="/dealers" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:flex items-center gap-1">
            <Building2 className="h-4 w-4" /> 加盟店
          </Link>
          {user ? (
            <>
              <Link href="/dashboard/favorites" className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:flex">
                <Heart className="h-4 w-4" /> お気に入り
              </Link>
              <Link href="/messages" className="relative hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:flex">
                <MessageSquare className="h-4 w-4" /> メッセージ
                {unreadCount > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/dashboard/reviews" className="relative hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:flex">
                <Star className="h-4 w-4" /> 評価
                {pendingReviews > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-bold text-white">
                    {pendingReviews}
                  </span>
                )}
              </Link>
              <Link href="/dashboard/listings" className="relative hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:flex">
                <LayoutDashboard className="h-4 w-4" /> マイページ
                {(pendingEscrows ?? 0) > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                    {(pendingEscrows ?? 0) > 9 ? '9+' : pendingEscrows}
                  </span>
                )}
              </Link>
              {isAdmin && (
                <Link href="/admin" className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-accent-600 hover:bg-accent-50 sm:flex">
                  <ShieldAlert className="h-4 w-4" /> 管理
                </Link>
              )}
              <PushNotificationManager />
              <NotificationBell userId={user?.id} />
              <Link href="/sell" className="btn-accent">
                <PlusCircle className="h-4 w-4" /> 出品する
              </Link>
              <form action="/auth/signout" method="post">
                <button className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
                ログイン
              </Link>
              <Link href="/signup" className="btn-primary whitespace-nowrap">
                無料登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
