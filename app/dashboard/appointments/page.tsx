import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, Clock, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import {
  APPT_KIND_LABEL,
  APPT_STATUS_LABEL,
  APPT_STATUS_CLS,
  type Appointment,
} from '@/lib/appointments';

export const dynamic = 'force-dynamic';
export const metadata = { title: '見学・試乗の予定 | BUYMO ダイレクト' };

type Row = Appointment & { listing_title?: string | null; counterparty?: string };

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/appointments');

  let rows: Row[] = [];
  let tableMissing = false;
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) tableMissing = true;
    const appts = (data ?? []) as Appointment[];

    // 相手の表示名・出品タイトルをまとめて取得
    const otherIds = [...new Set(appts.map((a) => (a.buyer_id === user.id ? a.seller_id : a.buyer_id)))];
    const listingIds = [...new Set(appts.map((a) => a.listing_id).filter(Boolean))] as string[];
    const nameMap = new Map<string, string>();
    const titleMap = new Map<string, string>();
    if (otherIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', otherIds);
      (profs ?? []).forEach((p: { id: string; display_name: string | null }) => nameMap.set(p.id, p.display_name ?? '相手'));
    }
    if (listingIds.length > 0) {
      const { data: ls } = await supabase.from('listings').select('id, title').in('id', listingIds);
      (ls ?? []).forEach((l: { id: string; title: string | null }) => titleMap.set(l.id, l.title ?? ''));
    }

    rows = appts.map((a) => ({
      ...a,
      counterparty: nameMap.get(a.buyer_id === user.id ? a.seller_id : a.buyer_id) ?? '相手',
      listing_title: a.listing_id ? titleMap.get(a.listing_id) ?? null : null,
    }));
  } catch {
    tableMissing = true;
  }

  const now = Date.now();
  const upcoming = rows
    .filter((r) => r.status === 'confirmed' && r.confirmed_slot && new Date(r.confirmed_slot).getTime() >= now)
    .sort((a, b) => new Date(a.confirmed_slot!).getTime() - new Date(b.confirmed_slot!).getTime());
  const proposed = rows.filter((r) => r.status === 'proposed');
  const past = rows.filter(
    (r) =>
      !upcoming.includes(r) &&
      !proposed.includes(r)
  );

  const Section = ({ title, items, icon }: { title: string; items: Row[]; icon: React.ReactNode }) =>
    items.length === 0 ? null : (
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-500">{icon}{title}</h2>
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-navy-800">
                  <span className="badge bg-navy-50 text-navy-700">{APPT_KIND_LABEL[r.kind]}</span>
                  <span className={`badge ${APPT_STATUS_CLS[r.status]}`}>{APPT_STATUS_LABEL[r.status]}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {r.status === 'confirmed' && r.confirmed_slot ? (
                    <span className="font-black">{formatDateTime(r.confirmed_slot)}</span>
                  ) : r.status === 'proposed' ? (
                    <span className="text-slate-500">候補 {r.proposed_slots.length}件（返信待ち／選択待ち）</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  相手: {r.counterparty}
                  {r.listing_title ? ` ・ ${r.listing_title}` : ''}
                </p>
              </div>
              <Link href={`/messages/${r.conversation_id}`} className="btn-outline shrink-0 text-sm">
                <MessageSquare className="h-4 w-4" /> チャットへ
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">見学・試乗の予定</h1>
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">appointments テーブルが未適用です。</p>
          <p className="mt-1">Supabase で <code>supabase/migrations/20240766_appointments.sql</code> を実行してください。</p>
        </div>
      )}

      {rows.length === 0 && !tableMissing ? (
        <p className="card p-10 text-center text-sm text-slate-500">
          予定はまだありません。出品ページの「見に行く」からチャットで日程を調整できます。
        </p>
      ) : (
        <>
          <Section title="確定した予定" items={upcoming} icon={<CalendarClock className="h-4 w-4 text-emerald-500" />} />
          <Section title="調整中" items={proposed} icon={<Clock className="h-4 w-4 text-amber-500" />} />
          <Section title="過去・見送り" items={past} icon={<Clock className="h-4 w-4 text-slate-300" />} />
        </>
      )}
    </div>
  );
}
