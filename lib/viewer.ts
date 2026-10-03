import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { canSeePremium } from '@/lib/membership';

/** 現在の閲覧者の会員状態とプレミアム解放可否をまとめて返す。 */
export async function getViewerAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null as string | null, loggedIn: false, tier: 'free', accountType: 'individual', isDealer: false, isAdmin: false, businessTrack: false, premium: false };
  }
  const { data: p } = await supabase.from('profiles').select('member_tier, role, account_type').eq('id', user.id).maybeSingle();
  const tier = (p as { member_tier?: string } | null)?.member_tier ?? 'free';
  const accountType = (p as { account_type?: string } | null)?.account_type ?? 'individual';
  const isAdmin = (p as { role?: string } | null)?.role === 'admin';
  const isDealer = (await getDealerForUser(user.id)) !== null;
  // 業者トラック＝加盟店/プロ・有料会員・本部。個人（individual）はここに入らない。
  const businessTrack = accountType === 'business' || isDealer || isAdmin || tier === 'paid';
  return { userId: user.id, loggedIn: true, tier, accountType, isDealer, isAdmin, businessTrack, premium: canSeePremium({ tier, isDealer, isAdmin }) };
}
