import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Flag } from 'lucide-react';
import { ReportButton } from '@/components/ReportButton';
import { createClient } from '@/lib/supabase/server';
import { MessageThread } from '@/components/MessageThread';
import { createEscrow } from '@/app/escrow/actions';
import { formatYen } from '@/lib/format';
import type { Message } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function ThreadPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/messages/${id}`);

  const { data: conv } = await supabase
    .from('conversations')
    .select('*, listings(id, title, maker, model, price, status, seller_id)')
    .eq('id', id)
    .maybeSingle();

  if (!conv) notFound();
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) notFound();

  // スレッドを開いた時点で既読化
  await supabase.rpc('mark_conversation_read', { p_conversation_id: id });

  const listing = (conv as any).listings;
  const isBuyer = conv.buyer_id === user.id;

  const { data: msgs } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  // 既存エスクローがあるか
  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('id, status')
    .eq('conversation_id', id)
    .maybeSingle();

  const createEscrowBound = createEscrow.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/messages" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> メッセージ一覧
      </Link>

      {/* 取引対象の車両 */}
      <div className="card mb-3 flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <Link href={`/listings/${listing?.id}`} className="truncate font-bold hover:underline">
            {listing?.title}
          </Link>
          <p className="text-sm text-slate-500">
            {listing?.maker} {listing?.model} ・ <span className="font-bold text-navy-600">{formatYen(listing?.price ?? 0)}</span>
          </p>
        </div>
        {escrow ? (
          <Link href={`/escrow/${escrow.id}`} className="btn-primary shrink-0">
            <ShieldCheck className="h-4 w-4" /> 取引を見る
          </Link>
        ) : isBuyer && listing?.status === 'active' ? (
          <form action={createEscrowBound}>
            <button className="btn-accent shrink-0">
              <ShieldCheck className="h-4 w-4" /> 購入手続きへ
            </button>
          </form>
        ) : null}
      </div>

      {/* 通報ボタン */}
      <div className="mb-3 flex justify-end">
        <ReportButton conversationId={id} />
      </div>

      {/* スレッド */}
      <div className="card overflow-hidden">
        <MessageThread
          conversationId={id}
          currentUserId={user.id}
          initialMessages={(msgs ?? []) as Message[]}
        />
      </div>
    </div>
  );
}
