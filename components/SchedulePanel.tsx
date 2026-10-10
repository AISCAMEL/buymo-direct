'use client';

import { useState } from 'react';
import { CalendarClock, Check, X, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import {
  APPT_KIND_LABEL,
  APPT_STATUS_LABEL,
  APPT_STATUS_CLS,
  MAX_SLOTS,
  type Appointment,
  type AppointmentKind,
} from '@/lib/appointments';
import { proposeAppointment, respondAppointment, cancelAppointment } from '@/app/messages/[id]/schedule-actions';

/** datetime-local の min 用：現在時刻（ローカル）を "YYYY-MM-DDTHH:mm" で返す。 */
function nowLocalValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // 1時間後以降を既定の下限に
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulePanel({
  conversationId,
  appointment,
  currentUserId,
  defaultKind = 'visit',
}: {
  conversationId: string;
  appointment: Appointment | null;
  currentUserId: string;
  defaultKind?: AppointmentKind;
}) {
  const active =
    appointment && (appointment.status === 'proposed' || appointment.status === 'confirmed')
      ? appointment
      : null;
  const isProposer = active?.proposed_by === currentUserId;
  const [showForm, setShowForm] = useState(false);
  const minValue = nowLocalValue();

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-navy-800">
          <CalendarClock className="h-5 w-5 text-navy-500" /> 日程調整（見学・試乗）
        </h2>
        {active && (
          <span className={`badge ${APPT_STATUS_CLS[active.status]}`}>
            {APPT_KIND_LABEL[active.kind]}・{APPT_STATUS_LABEL[active.status]}
          </span>
        )}
      </div>

      {/* 確定済み */}
      {active?.status === 'confirmed' && active.confirmed_slot && (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-xs font-bold text-emerald-700">{APPT_KIND_LABEL[active.kind]}の予定が確定しました</p>
            <p className="mt-1 text-xl font-black text-emerald-700">{formatDateTime(active.confirmed_slot)}</p>
          </div>
          {active.note && <p className="text-xs text-slate-500">メモ: {active.note}</p>}
          <a
            href={`/api/appointments/${active.id}/ics`}
            className="btn-outline w-full"
          >
            <CalendarClock className="h-4 w-4" /> カレンダーに追加（.ics）
          </a>
          <form action={cancelAppointment}>
            <input type="hidden" name="appointment_id" value={active.id} />
            <button className="w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
              予定をキャンセル
            </button>
          </form>
        </div>
      )}

      {/* 提案中 */}
      {active?.status === 'proposed' && (
        <div className="space-y-3">
          {active.note && <p className="text-xs text-slate-500">メモ: {active.note}</p>}
          {isProposer ? (
            <>
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <Clock className="h-4 w-4 text-amber-500" /> 相手の返信待ちです。提案した候補日時：
              </p>
              <ul className="space-y-1.5">
                {active.proposed_slots.map((s) => (
                  <li key={s} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    {formatDateTime(s)}
                  </li>
                ))}
              </ul>
              <form action={cancelAppointment}>
                <input type="hidden" name="appointment_id" value={active.id} />
                <button className="w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
                  提案を取り消す
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">ご都合の良い日時をお選びください：</p>
              <ul className="space-y-2">
                {active.proposed_slots.map((s) => (
                  <li key={s}>
                    <form action={respondAppointment}>
                      <input type="hidden" name="appointment_id" value={active.id} />
                      <input type="hidden" name="action" value="confirm" />
                      <input type="hidden" name="slot" value={s} />
                      <button className="flex w-full items-center justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 hover:border-emerald-400">
                        <span>{formatDateTime(s)}</span>
                        <span className="flex items-center gap-1 text-xs"><Check className="h-4 w-4" />この日時で確定</span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={respondAppointment}>
                <input type="hidden" name="appointment_id" value={active.id} />
                <input type="hidden" name="action" value="decline" />
                <button className="w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
                  <X className="mr-1 inline h-3.5 w-3.5" />どの候補も都合が合わない（お断り）
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* 日程がない／見送り後：新規提案 */}
      {!active && (
        <div>
          {appointment && (appointment.status === 'declined' || appointment.status === 'cancelled') && (
            <p className="mb-2 text-xs text-slate-400">
              前回の{APPT_KIND_LABEL[appointment.kind]}は{APPT_STATUS_LABEL[appointment.status]}でした。別の候補日時を提案できます。
            </p>
          )}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-outline w-full"
            >
              <CalendarClock className="h-4 w-4" /> 候補日時を提案する
            </button>
          ) : (
            <form action={proposeAppointment} className="space-y-3">
              <input type="hidden" name="conversation_id" value={conversationId} />
              <div>
                <label className="label">種別</label>
                <select name="kind" defaultValue={defaultKind} className="input">
                  <option value="visit">現車確認（見に行く）</option>
                  <option value="testdrive">試乗</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label">候補日時（最大{MAX_SLOTS}件・1件以上）</label>
                {Array.from({ length: MAX_SLOTS }, (_, i) => (
                  <input
                    key={i}
                    type="datetime-local"
                    name={`slot_${i}`}
                    min={minValue}
                    defaultValue=""
                    required={i === 0}
                    className="input"
                  />
                ))}
              </div>
              <div>
                <label className="label">メモ（任意）</label>
                <input name="note" className="input" placeholder="例）午後希望／最寄り駅まで送迎できます など" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-accent flex-1">この候補で提案する</button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50">
                  やめる
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
