'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendPushToUser } from '@/lib/push';
import { analyzeMessage } from '@/lib/moderation';

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

  // 外部連絡先・直接取引誘導の検知＆マスキング（AIキー不要のルールベース）
  const mod = text ? analyzeMessage(text) : { level: 0 as const, reasons: [], masked: '', flagged: false };
  const storedBody = mod.flagged ? mod.masked : text;

  const { data: inserted, error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: storedBody,
    attachment_url: attachmentUrl ?? null,
    flagged: mod.flagged,
    risk_level: mod.level,
  }).select('id').single();
  if (error) return { error: error.message };

  // 検知時：原文＋理由を証拠として記録（本部のみ参照可・service role）
  if (mod.flagged) {
    try {
      const svc = createServiceClient();
      await svc.from('moderation_events').insert({
        message_id: inserted?.id ?? null,
        conversation_id: conversationId,
        actor_id: user.id,
        kind: 'chat',
        level: mod.level,
        reasons: mod.reasons.join(' / '),
        original: text,
      });
    } catch { /* 記録失敗はメッセージ送信を妨げない */ }
  }

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
    const pushBody = storedBody
      ? `${listing?.title ?? '車両'}: ${storedBody.slice(0, 60)}`
      : `${listing?.title ?? '車両'}: 画像が届きました`;
    sendPushToUser(recipientId, {
      title: '新着メッセージ',
      body: pushBody,
      url: `/messages/${conversationId}`,
    }).catch(() => {/* fire-and-forget */});
  }

  revalidatePath(`/messages/${conversationId}`);
  const warning = mod.flagged
    ? '安全のため、外部の連絡先や直接取引のご案内は自動で保護されました。お取引はBUYMO内で行ってください。'
    : null;
  return { error: null, warning };
}
