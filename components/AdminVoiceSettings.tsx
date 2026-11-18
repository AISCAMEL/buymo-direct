'use client';

import { useState } from 'react';
import { Loader2, Save, CheckCircle2, Power, RotateCcw } from 'lucide-react';

type VoiceSettings = {
  enabled: boolean;
  greeting: string;
  instructions: string;
  hours: string;
};

const DEFAULT_GREETING =
  'お電話ありがとうございます。中古車のバイモダイレクト、AI音声案内です。査定・買取、故障や修理、ご購入のご相談など、折り返しのご予約も承ります。ご用件をお話しください。';

export function AdminVoiceSettings({ initial }: { initial: VoiceSettings }) {
  const [s, setS] = useState<VoiceSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function up<K extends keyof VoiceSettings>(k: K, v: VoiceSettings[K]) {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/voice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (data.ok) {
        setS(data.settings);
        setSaved(true);
      } else {
        setError(data.error ?? '保存に失敗しました');
      }
    } catch {
      setError('通信に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">AI電話の設定</h2>
        <button onClick={save} disabled={saving} className="btn-accent text-sm disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        ここで変更すると、デプロイ不要で次の着信からすぐ反映されます。
      </p>

      {/* 受付ON/OFF */}
      <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <span className="flex items-center gap-2 text-sm font-bold text-navy-800">
          <Power className={`h-4 w-4 ${s.enabled ? 'text-emerald-500' : 'text-slate-400'}`} />
          AI受付を有効にする
          <span className={`badge ${s.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
            {s.enabled ? '受付中' : '停止中（準備中案内）'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => up('enabled', !s.enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${s.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-pressed={s.enabled}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${s.enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </label>

      {/* 挨拶文 */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="label mb-0">挨拶文（第一声）</label>
          <button type="button" onClick={() => up('greeting', DEFAULT_GREETING)} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700">
            <RotateCcw className="h-3 w-3" /> 既定に戻す
          </button>
        </div>
        <textarea
          className="input min-h-[80px]"
          value={s.greeting}
          onChange={(e) => up('greeting', e.target.value)}
          placeholder={DEFAULT_GREETING}
        />
        <p className="mt-1 text-[11px] text-slate-400">電話に出たとき最初に読み上げる案内。短く・話し言葉で。</p>
      </div>

      {/* AIの話し方・指示 */}
      <div className="mt-4">
        <label className="label">AIオペレーターへの追加指示</label>
        <textarea
          className="input min-h-[90px]"
          value={s.instructions}
          onChange={(e) => up('instructions', e.target.value)}
          placeholder="例）丁寧だが親しみやすく。買取保証つきを強調。しつこい営業はしない。査定額は電話で断定しない。"
        />
        <p className="mt-1 text-[11px] text-slate-400">話し方・強調したい点・言ってはいけないこと等。AIの応答に反映されます。</p>
      </div>

      {/* 営業時間の案内 */}
      <div className="mt-4">
        <label className="label">営業時間の案内（任意）</label>
        <input
          className="input"
          value={s.hours}
          onChange={(e) => up('hours', e.target.value)}
          placeholder="例）査定はオンラインで24時間受付。お電話の折り返しは平日10時〜18時。"
        />
        <p className="mt-1 text-[11px] text-slate-400">お客様に営業時間を聞かれたときの案内に使われます。</p>
      </div>

      {/* 状態 */}
      <div className="mt-4 flex items-center gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> 保存しました（次の着信から反映）
          </span>
        )}
        {error && <span className="text-sm font-bold text-red-600">{error}</span>}
      </div>
    </div>
  );
}
