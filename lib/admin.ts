import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** 管理者ページ用ガード。未ログイン→/login、非管理者→/。 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((data as { role?: string } | null)?.role !== 'admin') redirect('/');
  return { supabase, user };
}

/** サーバーアクション用：管理者かどうかを返す（リダイレクトしない）。 */
export async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return (data as { role?: string } | null)?.role === 'admin';
}

type AdminCtx = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

/** サーバーアクション用：管理者なら {supabase, userId}、そうでなければ null。 */
export async function adminContext(): Promise<AdminCtx | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((data as { role?: string } | null)?.role !== 'admin') return null;
  return { supabase, userId: user.id };
}

/** 監査ログを記録（呼び出し元で管理者確認済みを前提）。 */
export async function logAdminAction(
  ctx: AdminCtx,
  action: string,
  targetType: string,
  targetId: string,
  detail?: string
) {
  await ctx.supabase.from('audit_logs').insert({
    actor_id: ctx.userId,
    action,
    target_type: targetType,
    target_id: targetId,
    detail: detail ?? null,
  });
}
