'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NotificationRefresher({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notif-header:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `buyer_id=eq.${userId}`,
      }, () => router.refresh())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `seller_id=eq.${userId}`,
      }, () => router.refresh())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'escrow_transactions',
        filter: `buyer_id=eq.${userId}`,
      }, () => router.refresh())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'escrow_transactions',
        filter: `seller_id=eq.${userId}`,
      }, () => router.refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, router]);

  return null;
}
