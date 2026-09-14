import { createServiceClient } from '@/lib/supabase/service';

export type NotificationType = 'message' | 'escrow' | 'kyc' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** 指定ユーザーへ通知を作成（サービスクライアント使用・RLS バイパス）。 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  const svc = createServiceClient();
  await svc.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
  });
}

/** 指定ユーザーの全通知を既読にする。 */
export async function markAllRead(userId: string): Promise<void> {
  const svc = createServiceClient();
  await svc
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

/** 指定ユーザーの未読通知数を返す。 */
export async function getUnreadCount(userId: string): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}
