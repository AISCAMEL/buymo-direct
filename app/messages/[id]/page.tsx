import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Flag } from 'lucide-react';
import { ReportButton } from '@/components/ReportButton';
import { createClient } from '@/lib/supabase/server';
import { MessageThread } from '@/components/MessageThread';
import { SchedulePanel } from '@/components/SchedulePanel';
import type { Appointment } from '@/lib/appointments';
import { createEscrow } from '@/app/escrow/actions';
import { formatYen } from '@/lib/format';
import { skillLabel, formatCaseNo, CASE_STATUS_LABEL, CASE_STATUS_CLS, type CaseStatus } from '@/lib/cases';
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
    .select('*, listings(id, title, maker, model, price, status, seller_id), case:cases(id, case_no, type, title, status)')
    .eq('id', id)
    .maybeSingle();

  if (!conv) notFound();
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) notFound();

  // スレッドを開いた時点で既読化
  await supabase.rpc('mark_conversation_read', { p_conversation_id: id });

  const listing = (conv as any).listings;
  const kase = (conv as any).case as
    | { id: string; case_no: number; type: string; title: string | null; status: CaseStatus }
    | null;
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

  // 最新の日程調整（見学・試乗）。テーブル未適用時はベストエフォートで null。
  let appointment: Appointment | null = null;
  try {
    const { data: apptRow } = await supabase
      .from('appointments')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    appointment = (apptRow as Appointment | null) ?? null;
  } catch {
    appointment = null;
  }

  const createEscrowBound = createEscrow.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/messages" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> メッセージ一覧
      </Link>

      {/* ヘッダー：案件チャット or 車両の取引 */}
      {kase ? (
        <div className="card mb-3 flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-bold">
              <span className="font-mono text-xs text-slate-400">{formatCaseNo(kase.case_no)}</span>
              {kase.title ?? `${skillLabel(kase.type)}のご依頼`}
              <span className={`badge ${CASE_STATUS_CLS[kase.status]}`}>{CASE_STATUS_LABEL[kase.status]}</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{skillLabel(kase.type)} の案件に関するチャット</p>
          </div>
          <Link
            href={isBuyer ? '/dashboard/cases' : '/dealer/cases'}
            className="btn-primary shrink-0"
          >
            案件を見る
          </Link>
        </div>
      ) : (
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
      )}

      {/* 日程調整（見学・試乗）：車両の取引チャットのみ */}
      {!kase && (
        <div className="mb-3">
          <SchedulePanel conversationId={id} appointment={appointment} currentUserId={user.id} />
        </div>
      )}

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
          role={isBuyer ? 'buyer' : 'seller'}
        />
      </div>
    </div>
  );
}
