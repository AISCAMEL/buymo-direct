// Computes which of the current user's conversations have unread messages.
// A conversation is unread when its last_message_at is newer than the caller's
// own last_read timestamp (sending or opening a thread marks it read).

type ConvReadRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_last_read_at: string;
  seller_last_read_at: string;
};

export function isUnread(conv: ConvReadRow, userId: string): boolean {
  const myRead = conv.buyer_id === userId ? conv.buyer_last_read_at : conv.seller_last_read_at;
  return new Date(conv.last_message_at).getTime() > new Date(myRead).getTime();
}

export async function unreadConversationIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string | undefined
): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, last_message_at, buyer_last_read_at, seller_last_read_at')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  const rows = (data ?? []) as ConvReadRow[];
  return new Set(rows.filter((c) => isUnread(c, userId)).map((c) => c.id));
}
