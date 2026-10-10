// 見学・試乗の日程調整（売り手・買い手のスケジュール機能）の共通定義。
// 候補日時を提案 → 相手が1つ選んで確定、の最小フロー。副作用なし（クライアント/サーバー両用）。

export type AppointmentKind = 'visit' | 'testdrive';
export type AppointmentStatus = 'proposed' | 'confirmed' | 'declined' | 'cancelled';

export const APPT_KIND_LABEL: Record<AppointmentKind, string> = {
  visit: '現車確認',
  testdrive: '試乗',
};

export const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  proposed: '日程調整中',
  confirmed: '日程確定',
  declined: 'お断り',
  cancelled: 'キャンセル',
};

export const APPT_STATUS_CLS: Record<AppointmentStatus, string> = {
  proposed: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
};

export interface Appointment {
  id: string;
  conversation_id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  proposed_slots: string[]; // ISO 文字列の配列
  confirmed_slot: string | null;
  note: string | null;
  proposed_by: string;
  created_at: string;
  updated_at: string;
}

/** 提案できる候補日時の最大数。 */
export const MAX_SLOTS = 3;

export function isAppointmentKind(v: string): v is AppointmentKind {
  return v === 'visit' || v === 'testdrive';
}

/** 候補日時の入力（ISO文字列）を正規化：未来のみ・重複除去・最大件数・昇順。 */
export function normalizeSlots(raw: (string | null | undefined)[]): string[] {
  const now = Date.now();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    if (!r) continue;
    const t = new Date(r).getTime();
    if (!Number.isFinite(t) || t <= now) continue;
    const iso = new Date(t).toISOString();
    if (seen.has(iso)) continue;
    seen.add(iso);
    out.push(iso);
  }
  out.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return out.slice(0, MAX_SLOTS);
}
