import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Conv = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing?: { title?: string | null } | null;
  buyer?: { display_name?: string | null } | null;
  seller?: { display_name?: string | null } | null;
};
type Msg = { id: string; sender_id: string; body: string; created_at: string };

export default async function AdminMessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: convData } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, listing:listings(title), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)')
    .eq('id', id)
    .maybeSingle();
  const conv = convData as unknown as Conv | null;
  if (!conv) notFound();

  const { data: msgData } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });
  const messages = (msgData ?? []) as Msg[];

  const buyerName = conv.buyer?.display_name ?? '購入者';
  const sellerName = conv.seller?.display_name ?? '出品者';

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/messages" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> チャット監視一覧
      </Link>

      <div className="card p-5">
        <h1 className="text-lg font-black text-navy-800">{conv.listing?.title ?? '（車両情報なし）'}</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-0.5 text-xs text-slate-400">購入者</p>
            <p className="font-bold text-navy-800">{buyerName}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-0.5 text-xs text-slate-400">出品者</p>
            <p className="font-bold text-navy-800">{sellerName}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <span className="font-bold text-slate-700">メッセージ（{messages.length}件）</span>
          <span className="ml-auto rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-400">本部閲覧モード（読み取り専用）</span>
        </div>
        <div className="divide-y divide-slate-50">
          {messages.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">メッセージはありません。</p>
          ) : messages.map((m) => {
            const isBuyer = m.sender_id === conv.buyer_id;
            return (
              <div key={m.id} className="p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isBuyer ? 'bg-navy-100 text-navy-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isBuyer ? `購入者: ${buyerName}` : `出品者: ${sellerName}`}
                  </span>
                  <span className="text-xs text-slate-400">{formatDateTime(m.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{m.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
