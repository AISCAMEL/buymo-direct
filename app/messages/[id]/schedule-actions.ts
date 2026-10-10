'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { formatDateTime } from '@/lib/format';
import {
  APPT_KIND_LABEL,
  isAppointmentKind,
  normalizeSlots,
  MAX_SLOTS,
  type AppointmentKind,
} from '@/lib/appointments';

/** 候補日時を提案する（買い手・売り手どちらでも可）。相手が1つ選んで確定する。 */
export async function proposeAppointment(formData: FormData): Promise<void> {
  const conversationId = String(formData.get('conversation_id') ?? '');
  const kindRaw = String(formData.get('kind') ?? 'visit');
  const kind: AppointmentKind = isAppointmentKind(kindRaw) ? kindRaw : 'visit';
  const note = String(formData.get('note') ?? '').trim() || null;
  const slots = normalizeSlots(
    Array.from({ length: MAX_SLOTS }, (_, i) => String(formData.get(`slot_${i}`) ?? ''))
  );
  if (!conversationId || slots.length === 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, listing_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) return;

  const { error } = await supabase.from('appointments').insert({
    conversation_id: conv.id,
    listing_id: conv.listing_id,
    buyer_id: conv.buyer_id,
    seller_id: conv.seller_id,
    kind,
    status: 'proposed',
    proposed_slots: slots,
    note,
    proposed_by: user.id,
  });
  if (error) return;

  // チャットにも残す（会話の記録として）
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    sender_id: user.id,
    body: `📅 ${APPT_KIND_LABEL[kind]}の候補日時を${slots.length}件提案しました。上の「日程調整」からお選びください。`,
  });

  const counterparty = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
  await createNotification(
    counterparty,
    'message',
    `${APPT_KIND_LABEL[kind]}の候補日時が届きました`,
    `候補日時が${slots.length}件提案されました。ご都合の良い日時をお選びください。`,
    `/messages/${conversationId}`
  );

  revalidatePath(`/messages/${conversationId}`);
}

/** 提案への返信：確定（slot を選ぶ）またはお断り。提案した本人以外のみ操作可。 */
export async function respondAppointment(formData: FormData): Promise<void> {
  const appointmentId = String(formData.get('appointment_id') ?? '');
  const action = String(formData.get('action') ?? ''); // confirm | decline
  const slot = String(formData.get('slot') ?? '');
  if (!appointmentId || (action !== 'confirm' && action !== 'decline')) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, conversation_id, buyer_id, seller_id, kind, status, proposed_slots, proposed_by')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!appt) return;
  if (appt.buyer_id !== user.id && appt.seller_id !== user.id) return;
  if (appt.status !== 'proposed') return;
  // 提案した本人は確定できない（相手が選ぶ）。
  if (appt.proposed_by === user.id) return;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === 'confirm') {
    const slots = (appt.proposed_slots as string[]) ?? [];
    if (!slots.includes(slot)) return;
    patch.status = 'confirmed';
    patch.confirmed_slot = slot;
  } else {
    patch.status = 'declined';
  }

  const { error } = await supabase.from('appointments').update(patch).eq('id', appointmentId).eq('status', 'proposed');
  if (error) return;

  const kindLabel = APPT_KIND_LABEL[(appt.kind as AppointmentKind) ?? 'visit'];
  // チャットに結果を自動投稿
  await supabase.from('messages').insert({
    conversation_id: appt.conversation_id,
    sender_id: user.id,
    body:
      action === 'confirm'
        ? `✅ ${kindLabel}の日程が確定しました：${formatDateTime(slot)}`
        : `🙏 ${kindLabel}の候補日程を見送りました。別の候補日時を調整できます。`,
  });

  if (action === 'confirm') {
    await createNotification(
      appt.proposed_by,
      'message',
      `${kindLabel}の日程が確定しました`,
      `${formatDateTime(slot)} で確定しました。`,
      `/messages/${appt.conversation_id}`
    );
  } else {
    await createNotification(
      appt.proposed_by,
      'message',
      `${kindLabel}の日程が見送りになりました`,
      '相手が候補日程を見送りました。別の候補日時を提案できます。',
      `/messages/${appt.conversation_id}`
    );
  }

  revalidatePath(`/messages/${appt.conversation_id}`);
}

/** 予定をキャンセルする（当事者どちらでも可）。 */
export async function cancelAppointment(formData: FormData): Promise<void> {
  const appointmentId = String(formData.get('appointment_id') ?? '');
  if (!appointmentId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, conversation_id, buyer_id, seller_id, kind')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!appt) return;
  if (appt.buyer_id !== user.id && appt.seller_id !== user.id) return;

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .in('status', ['proposed', 'confirmed']);
  if (error) return;

  const kindLabel = APPT_KIND_LABEL[(appt.kind as AppointmentKind) ?? 'visit'];
  await supabase.from('messages').insert({
    conversation_id: appt.conversation_id,
    sender_id: user.id,
    body: `❌ ${kindLabel}の予定をキャンセルしました。`,
  });

  const counterparty = appt.buyer_id === user.id ? appt.seller_id : appt.buyer_id;
  await createNotification(
    counterparty,
    'message',
    `${kindLabel}の予定がキャンセルされました`,
    '相手が予定をキャンセルしました。必要に応じて再度日程を調整してください。',
    `/messages/${appt.conversation_id}`
  );

  revalidatePath(`/messages/${appt.conversation_id}`);
}
