import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { canSeePremium } from '@/lib/membership';

/** 現在の閲覧者の会員状態とプレミアム解放可否をまとめて返す。 */
export async function getViewerAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null as string | null, loggedIn: false, tier: 'free', isDealer: false, isAdmin: false, premium: false };
  }
  const { data: p } = await supabase.from('profiles').select('member_tier, role').eq('id', user.id).maybeSingle();
  const tier = (p as { member_tier?: string } | null)?.member_tier ?? 'free';
  const isAdmin = (p as { role?: string } | null)?.role === 'admin';
  const isDealer = (await getDealerForUser(user.id)) !== null;
  return { userId: user.id, loggedIn: true, tier, isDealer, isAdmin, premium: canSeePremium({ tier, isDealer, isAdmin }) };
}
