import Link from 'next/link';
import { MessageSquare, Eye } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Conv = {
  id: string;
  last_message_at: string;
  listing?: { title?: string | null } | null;
  buyer?: { display_name?: string | null } | null;
  seller?: { display_name?: string | null } | null;
};

export default async function AdminMessagesPage() {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('conversations')
    .select('id, last_message_at, listing:listings(title), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)')
    .order('last_message_at', { ascending: false })
    .limit(100);
  const convs = (data ?? []) as unknown as Conv[];

  // 各会話の最新メッセージを1回のクエリで取得
  const ids = convs.map((c) => c.id);
  const lastMsg = new Map<string, string>();
  if (ids.length) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false });
    for (const m of (msgs ?? []) as { conversation_id: string; body: string }[]) {
      if (!lastMsg.has(m.conversation_id)) lastMsg.set(m.conversation_id, m.body);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">チャット監視（{convs.length}）</h1>
      </div>
      <p className="text-sm text-slate-500">直近の会話を新しい順に表示しています。詳細を開くとやり取りの全文を確認できます。</p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>{['車両', '当事者（購入者／出品者）', '最終メッセージ', '最終更新', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {convs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">会話はまだありません。</td></tr>
              ) : convs.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-bold text-navy-800">{c.listing?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.buyer?.display_name ?? '—'} ／ {c.seller?.display_name ?? '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">{lastMsg.get(c.id) ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(c.last_message_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/messages/${c.id}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-navy-600 hover:bg-slate-50">
                      <Eye className="h-3.5 w-3.5" /> 詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
