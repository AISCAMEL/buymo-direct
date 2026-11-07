import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { twilioConfigStatus, isTwilioRestConfigured } from '@/lib/twilio';
import { AdminVoicePanel } from '@/components/AdminVoicePanel';
import { Phone, CheckCircle2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

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

      <p className="text-xs text-slate-400">
        ※ 会話メモリ（通話中の文脈）には <span className="font-mono">supabase/voice.sql</span> の実行が必要です（未実行でも1発話ごとに応答します）。
      </p>
    </div>
  );
}
