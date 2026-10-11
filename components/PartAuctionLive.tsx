'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** 出品詳細をリアルタイム更新（現在価格・入札・終了時刻）。 */
export function PartAuctionLive({ auctionId }: { auctionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`part-auction:${auctionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'part_auctions',
        filter: `id=eq.${auctionId}`,
      }, () => router.refresh())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'part_bids',
        filter: `auction_id=eq.${auctionId}`,
      }, () => router.refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [auctionId, router]);

  return null;
}
