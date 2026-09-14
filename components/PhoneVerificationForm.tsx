'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp } from '@/app/dashboard/phone/actions';

export function PhoneVerificationForm({
  userId: _userId,
  currentPhone,
  isVerified,
}: {
  userId: string;
  currentPhone: string | null;
  isVerified: boolean;
}) {
  const [phone, setPhone] = useState(currentPhone ?? '');
  const [step, setStep] = useState<'enter' | 'verify' | 'done'>(isVerified ? 'done' : 'enter');
  const [code, setCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (step === 'done') {
    return (
      <div className="card flex items-center gap-3 bg-emerald-50 p-6">
        <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-500" />
        <div>
          <p className="font-bold text-emerald-700">電話番号認証済み</p>
          <p className="text-sm text-emerald-600">{currentPhone ?? phone}</p>
        </div>
      </div>
    );
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await sendPhoneOtp(phone);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setDemoOtp(res.demoOtp ?? null);
    setStep('verify');
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await verifyPhoneOtp(phone, code);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setStep('done');
  }

  if (step === 'verify') {
    return (
      <div className="card space-y-4 p-6">
        <p className="text-sm text-slate-600">
          <span className="font-bold">{phone}</span> に認証コードを送信しました。
          届いた6桁のコードを入力してください。
        </p>

        {demoOtp && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            ⚠️ デモモード — SMS は送信されていません。認証コード：
            <span className="ml-1 font-black tracking-widest">{demoOtp}</span>
          </div>
        )}

        <form onSubmit={onVerify} className="space-y-3">
          <div>
            <label className="label">認証コード（6桁）</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              className="input text-center text-2xl tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading || code.length !== 6} className="btn-accent w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" /> 認証する
          </button>
          <button
            type="button"
            onClick={() => { setStep('enter'); setCode(''); setError(null); }}
            className="w-full text-center text-sm text-slate-400 hover:underline"
          >
            電話番号を変更 / 再送
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={onSend} className="card space-y-4 p-6">
      <div>
        <label className="label">電話番号</label>
        <input
          type="tel"
          required
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="090-1234-5678"
        />
        <p className="mt-1 text-xs text-slate-400">ハイフンあり・なしどちらでも可。SMS で認証コードを送ります。</p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={loading || !phone.trim()} className="btn-accent w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        認証コードを送信
      </button>
    </form>
  );
}
