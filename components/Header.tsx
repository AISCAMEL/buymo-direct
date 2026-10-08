import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { unreadConversationIds } from '@/lib/unread';
import { pendingReviewCount } from '@/lib/pendingReviews';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import { NotificationBell } from '@/components/NotificationBell';
import { UserMenu } from '@/components/UserMenu';

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
  let isDealer = false;
  let businessTrack = false;
  let buybackOpen = false;
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('role, member_tier, account_type, business_kind').eq('id', user.id).maybeSingle();
    const p = prof as { role?: string; member_tier?: string; account_type?: string; business_kind?: string | null } | null;
    isAdmin = p?.role === 'admin';
    isDealer = (await getDealerForUser(user.id)) !== null;
    // 業者トラック（プロ・加盟店・有料会員・本部）だけに買取系を見せる。個人は対象外。
    businessTrack = p?.account_type === 'business' || isDealer || isAdmin || p?.member_tier === 'paid';
    // 買取加盟（全開放）：買取募集からの加盟・加盟店・有料会員・本部。
    buybackOpen = p?.business_kind === 'buyback' || isDealer || isAdmin || p?.member_tier === 'paid';
  }
  const skillTrack = businessTrack && !buybackOpen;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-navy-500">
          <Image src="/buymo-logo-mark.png" alt="BUYMO" width={32} height={32} className="h-7 w-7 object-contain sm:h-8 sm:w-8" priority />
          <span className="flex items-center gap-1 text-lg font-black tracking-tight leading-none sm:gap-1.5 sm:text-[22px]">
            BUYMO<span className="rounded-md bg-gold-500 px-1.5 py-0.5 text-base font-black leading-none text-navy-900 sm:px-2 sm:text-[20px]">BD</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-2">
          <Link href="/listings" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-block">
            車を探す
          </Link>
          <Link href="/about" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 lg:inline-block">
            初めての方へ
          </Link>
          <Link href="/column" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 lg:inline-block">
            コラム
          </Link>
          {businessTrack && (
            <Link href="/learn" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-block">
              買取を学ぶ
            </Link>
          )}
          {user ? (
            <>
              <NotificationBell userId={user?.id} />
              <Link href="/sell" className="btn-accent whitespace-nowrap">
                <PlusCircle className="h-4 w-4" /> 出品する
              </Link>
              <UserMenu
                unreadCount={unreadCount}
                pendingReviews={pendingReviews}
                pendingEscrows={pendingEscrows ?? 0}
                isAdmin={isAdmin}
                isDealer={isDealer}
                businessTrack={businessTrack}
                buybackOpen={buybackOpen}
                skillTrack={skillTrack}
              />
              <span className="hidden lg:block"><PushNotificationManager /></span>
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:px-3">
                ログイン
              </Link>
              <Link href="/signup" className="btn-primary whitespace-nowrap px-3 sm:px-4">
                無料登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
