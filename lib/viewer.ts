import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { canSeePremium } from '@/lib/membership';

/** 現在の閲覧者の会員状態とプレミアム解放可否をまとめて返す。 */
export async function getViewerAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      userId: null as string | null, loggedIn: false, tier: 'free', accountType: 'individual',
      businessKind: null as string | null, isDealer: false, isAdmin: false,
      businessTrack: false, buybackOpen: false, skillTrack: false, premium: false,
    };
  }
  const { data: p } = await supabase.from('profiles').select('member_tier, role, account_type, business_kind').eq('id', user.id).maybeSingle();
  const tier = (p as { member_tier?: string } | null)?.member_tier ?? 'free';
  const accountType = (p as { account_type?: string } | null)?.account_type ?? 'individual';
  const businessKind = (p as { business_kind?: string | null } | null)?.business_kind ?? null;
  const isAdmin = (p as { role?: string } | null)?.role === 'admin';
  const isDealer = (await getDealerForUser(user.id)) !== null;
  // 業者トラック＝加盟店/プロ・有料会員・本部。個人（individual）はここに入らない。
  const businessTrack = accountType === 'business' || isDealer || isAdmin || tier === 'paid';
  // 買取加盟（全開放）＝買取募集からの加盟・加盟店・有料会員・本部。
  const buybackOpen = businessKind === 'buyback' || isDealer || isAdmin || tier === 'paid';
  // スキルマッチング登録のみ＝買取を学ぶ/コミュニティは見えるが、有料会員は後出し。
  const skillTrack = businessTrack && !buybackOpen;
  return {
    userId: user.id, loggedIn: true, tier, accountType, businessKind, isDealer, isAdmin,
    businessTrack, buybackOpen, skillTrack, premium: canSeePremium({ tier, isDealer, isAdmin }),
  };
}
