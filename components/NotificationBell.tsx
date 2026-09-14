'use client';

import { useEffect, useRef, useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  MessageSquare,
  ShieldCheck,
  BadgeCheck,
  Bell,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { NotificationType } from '@/lib/notifications';

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />;
    case 'escrow':
      return <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'kyc':
      return <BadgeCheck className="h-4 w-4 text-green-500 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-slate-400 shrink-0" />;
  }
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

interface Props {
  userId?: string;
}

export function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const recalcUnread = useCallback((list: Notification[]) => {
    setUnreadCount(list.filter((n) => !n.read_at).length);
  }, []);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const list = (data ?? []) as Notification[];
        setNotifications(list);
        recalcUnread(list);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            const updated = [newNotif, ...prev].slice(0, 50);
            recalcUnread(updated);
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => {
            const list = prev.map((n) => (n.id === updated.id ? updated : n));
            recalcUnread(list);
            return list;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, recalcUnread]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkAllRead = useCallback(async () => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) => {
      const now = new Date().toISOString();
      const list = prev.map((n) => (n.read_at ? n : { ...n, read_at: now }));
      recalcUnread(list);
      return list;
    });

    const res = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      // Revert optimistic update on error — re-fetch
      const supabase = createClient();
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      const list = (data ?? []) as Notification[];
      setNotifications(list);
      recalcUnread(list);
    }
  }, [userId, recalcUnread]);

  const handleNotificationClick = useCallback(
    (notif: Notification) => {
      if (notif.link) {
        setOpen(false);
        startTransition(() => {
          router.push(notif.link!);
        });
      }
    },
    [router]
  );

  if (!userId) return null;

  const badge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="通知"
      >
        <BellRing className="h-5 w-5" />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {badge}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-bold text-slate-700">通知</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                すべて既読
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <Bell className="h-8 w-8 opacity-40" />
                <p className="text-sm">通知はありません</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    !notif.read_at ? 'bg-blue-50/50' : ''
                  } ${notif.link ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="mt-0.5">{typeIcon(notif.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${!notif.read_at ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notif.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">{relativeTime(notif.created_at)}</p>
                  </div>
                  {!notif.read_at && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
