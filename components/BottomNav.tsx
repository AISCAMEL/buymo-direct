import { createClient } from '@/lib/supabase/server';
import { unreadConversationIds } from '@/lib/unread';
import { BottomNavLinks } from './BottomNavLinks';

export async function BottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const unreadCount = user ? (await unreadConversationIds(supabase, user.id)).size : 0;
  const userHref = user ? '/dashboard/listings' : '/login';

  return <BottomNavLinks unreadCount={unreadCount} userHref={userHref} />;
}
