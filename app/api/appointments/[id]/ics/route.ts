/**
 * GET /api/appointments/:id/ics
 * 確定済みの見学・試乗予定を iCalendar(.ics) で返す。当事者のみ取得可（RLS）。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APPT_KIND_LABEL, type AppointmentKind } from '@/lib/appointments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** ISO → iCalendar の UTC 形式（YYYYMMDDTHHMMSSZ）。 */
function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** iCalendar テキスト値のエスケープ。 */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS により当事者のみ取得できる
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, kind, status, confirmed_slot, note, listing_id, conversation_id')
    .eq('id', id)
    .maybeSingle();

  if (!appt || appt.status !== 'confirmed' || !appt.confirmed_slot) {
    return NextResponse.json({ error: 'Not found or not confirmed' }, { status: 404 });
  }

  let listingTitle = '';
  if (appt.listing_id) {
    const { data: l } = await supabase.from('listings').select('title').eq('id', appt.listing_id).maybeSingle();
    listingTitle = (l as { title?: string } | null)?.title ?? '';
  }

  const kindLabel = APPT_KIND_LABEL[(appt.kind as AppointmentKind) ?? 'visit'];
  const start = new Date(appt.confirmed_slot as string);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1時間
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me').replace(/\/$/, '');
  const summary = `${kindLabel}${listingTitle ? `：${listingTitle}` : ''}（BUYMO）`;
  const description = `${kindLabel}の予定です。${appt.note ? `メモ: ${appt.note}。` : ''}詳細・やりとりはチャットから：${site}/messages/${appt.conversation_id}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BUYMO Direct//Appointments//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appt-${appt.id}@buymo`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(start.toISOString())}`,
    `DTEND:${toICSDate(end.toISOString())}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`${kindLabel}の予定（前日のお知らせ）`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const body = lines.join('\r\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="buymo-appointment-${appt.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
