import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { twilioConfigStatus, isTwilioRestConfigured } from '@/lib/twilio';
import { AdminVoicePanel } from '@/components/AdminVoicePanel';
import { createServiceClient } from '@/lib/supabase/service';
import { CATEGORY_LABEL, type BookingCategory } from '@/lib/voice-booking';
import { formatDateTime } from '@/lib/format';
import { Phone, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

type VoiceBooking = {
  id: number;
  phone: string | null;
  category: BookingCategory | null;
  name: string | null;
  preferred: string | null;
  vehicle: string | null;
  status: string;
  created_at: string;
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  new: '未対応',
  contacted: '連絡済み',
  done: '完了',
  cancelled: 'キャンセル',
};
const BOOKING_STATUS_CLS: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-sky-100 text-sky-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-500',
};

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
      <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </li>
  );
}

export default async function AdminVoicePage() {
  await requireAdmin();
  const cfg = twilioConfigStatus();
  const inboundReady = cfg.authToken; // 着信は AUTH_TOKEN（署名検証）で有効化
  const restReady = isTwilioRestConfigured();
  const webhook = `${SITE}/api/voice/incoming`;

  // 電話で受けた折り返し予約（voice_bookings）。テーブル未作成でも画面は出す。
  let bookings: VoiceBooking[] = [];
  let bookingsTableMissing = false;
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('voice_bookings')
      .select('id, phone, category, name, preferred, vehicle, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) bookingsTableMissing = true;
    else bookings = (data ?? []) as VoiceBooking[];
  } catch {
    bookingsTableMissing = true;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Phone className="h-6 w-6 text-accent-600" /> AI電話（Twilio連携）
        </h1>
        <p className="text-sm text-slate-500">
          お客様の電話にAIが音声で応答（着信）し、AIからお客様へ架電（発信）もできます。音声認識・読み上げはTwilio、会話はClaudeです。
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-bold">設定状況</h2>
        <ul className="space-y-1.5">
          <Row ok={isAiEnabled()} label="AI（ANTHROPIC_API_KEY）設定済み ← 会話生成に必須" />
          <Row ok={cfg.authToken} label="TWILIO_AUTH_TOKEN 設定済み ← 着信AIの有効化・署名検証に必須" />
          <Row ok={cfg.accountSid} label="TWILIO_ACCOUNT_SID 設定済み ← 発信に必要" />
          <Row ok={cfg.phoneNumber} label="TWILIO_PHONE_NUMBER 設定済み ← 発信元番号" />
        </ul>
        <p className="mt-2 text-xs text-slate-400">読み上げ音声：{cfg.ttsVoice}（TWILIO_TTS_VOICE で変更可）</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-bold">着信の設定手順（Twilio）</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Twilioで電話番号を取得（音声対応）。</li>
          <li>その番号の設定「A CALL COMES IN」を <span className="font-mono">Webhook / HTTP POST</span> にし、URLに下記を設定：
            <div className="mt-1 break-all rounded bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">{webhook}</div>
          </li>
          <li>Vercelの環境変数に <span className="font-mono">TWILIO_AUTH_TOKEN</span>（＝Twilioの Auth Token）を設定し再デプロイ。</li>
          <li>発信も使う場合は <span className="font-mono">TWILIO_ACCOUNT_SID</span> と <span className="font-mono">TWILIO_PHONE_NUMBER</span>（E.164 例:+81…）も設定。</li>
        </ol>
        <p className="mt-2 text-xs text-slate-400">
          {inboundReady
            ? '✅ 着信AIは有効です。上記URLを設定した番号に電話するとAIが応答します。'
            : '⏳ TWILIO_AUTH_TOKEN 未設定のため、着信は「準備中」案内になります（安全に無効化中）。'}
        </p>
      </div>

      <AdminVoicePanel restReady={restReady} />

      {/* 電話で受けた折り返し予約 */}
      <div className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-bold">
          <CalendarClock className="h-5 w-5 text-accent-600" /> 電話予約（折り返し）{bookings.length > 0 && <span className="text-sm font-normal text-slate-400">{bookings.length}件</span>}
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          着信AIが用件・お名前・ご希望時間を確認して受け付けた、折り返しのご予約です。発信先をタップでそのまま架電できます。
        </p>
        {bookingsTableMissing ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
            予約テーブルが未作成です。<span className="font-mono">supabase/migrations/20240787_voice_bookings.sql</span> を実行すると、電話で受けた予約がここに一覧表示されます。
          </p>
        ) : bookings.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">まだ電話予約はありません。</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy-800">
                    <span className="badge bg-navy-50 text-navy-700">{b.category ? CATEGORY_LABEL[b.category] : 'ご相談'}</span>
                    {b.name ?? '（お名前未取得）'} 様
                    <span className={`badge ${BOOKING_STATUS_CLS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    希望：{b.preferred ?? '—'}{b.vehicle ? ` ・ ${b.vehicle}` : ''} ／ 受付 {formatDateTime(b.created_at)}
                  </p>
                </div>
                {b.phone ? (
                  <a href={`tel:${b.phone}`} className="btn-outline shrink-0 px-3 py-1.5 text-xs">
                    <Phone className="h-3.5 w-3.5" /> {b.phone}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">番号非通知</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-400">
        ※ 会話メモリ（通話中の文脈）には <span className="font-mono">supabase/voice.sql</span>、折り返し予約の保存には <span className="font-mono">supabase/migrations/20240787_voice_bookings.sql</span> の実行が必要です（未実行でも通話自体は動作します）。
      </p>
    </div>
  );
}
