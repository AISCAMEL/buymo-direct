'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push';

/** スレッドにメッセージを送信。RLS により当事者のみ許可される。 */
export async function sendMessage(
  conversationId: string,
  body: string,
  attachmentUrl?: string | null
) {
  const text = body.trim();
  if (!text && !attachmentUrl) return { error: 'メッセージまたは画像が必要です' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: text,
    attachment_url: attachmentUrl ?? null,
  });
  if (error) return { error: error.message };

  // 送信者側は既読（自分の送信が自分の未読にならないように）
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });

  // 相手にプッシュ通知
  const { data: conv } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id, listings(title)')
    .eq('id', conversationId)
    .maybeSingle();
  if (conv) {
    const recipientId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
    const listing = (conv as { listings?: { title?: string } | null }).listings;
    const pushBody = text
      ? `${listing?.title ?? '車両'}: ${text.slice(0, 60)}`
      : `${listing?.title ?? '車両'}: 画像が届きました`;
    sendPushToUser(recipientId, {
      title: '新着メッセージ',
      body: pushBody,
      url: `/messages/${conversationId}`,
    }).catch(() => {/* fire-and-forget */});
  }

  revalidatePath(`/messages/${conversationId}`);
  return { error: null };
}
