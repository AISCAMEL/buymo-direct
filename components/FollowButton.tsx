'use client';

import { useState, useTransition } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function FollowButton({
  targetUserId,
  initialFollowing,
  loggedIn,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  loggedIn: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!loggedIn) { window.location.href = '/login'; return; }
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (following) {
        await supabase.from('follows').delete()
          .eq('follower_id', user.id).eq('following_id', targetUserId);
        setFollowing(false);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
        setFollowing(true);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        following
          ? 'bg-navy-100 text-navy-700 hover:bg-navy-200'
          : 'border border-navy-300 bg-white text-navy-500 hover:bg-navy-50'
      }`}
    >
      {following ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {following ? 'フォロー中' : 'フォローする'}
    </button>
  );
}
