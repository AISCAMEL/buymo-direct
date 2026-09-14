'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/format';

export function FavoriteButton({
  listingId,
  initialFavorited,
  loggedIn,
  variant = 'icon',
}: {
  listingId: string;
  initialFavorited: boolean;
  loggedIn: boolean;
  variant?: 'icon' | 'full';
}) {
  const router = useRouter();
  const [fav, setFav] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/login?redirect=/listings/${listingId}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/listings/${listingId}`);
      return;
    }

    const next = !fav;
    setFav(next); // optimistic
    if (next) {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
      if (error) setFav(false);
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);
      if (error) setFav(true);
    }
    setBusy(false);
    router.refresh();
  }

  if (variant === 'full') {
    return (
      <button onClick={toggle} disabled={busy} className={cn('btn-outline w-full', fav && 'border-red-300 text-red-600')}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn('h-4 w-4', fav && 'fill-red-500 text-red-500')} />}
        {fav ? 'お気に入り登録済み' : 'お気に入りに追加'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label="お気に入り"
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <Heart className={cn('h-4 w-4', fav ? 'fill-red-500 text-red-500' : 'text-slate-400')} />
      )}
    </button>
  );
}
