'use client';

import { useState } from 'react';
import { Truck, Calculator, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { TRANSPORT_PREFS, CAR_SIZES, estimateTransport } from '@/lib/transport';
import { formatYen } from '@/lib/format';

export function TransportSimulator() {
  const [fromPref, setFromPref] = useState('');
  const [toPref, setToPref] = useState('');
  const [size, setSize] = useState('normal');
  const [est, setEst] = useState<{ low: number; high: number } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 申込フォーム
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function simulate() {
    setError(null);
    if (!fromPref || !toPref) { setError('出発地と到着地を選んでください。'); return; }
    const r = estimateTransport(fromPref, toPref, size);
    setEst(r);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('お名前を入力してください。'); return; }
    if (!phone.trim()) { setError('電話番号を入力してください。'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPref, toPref, carSize: size,
          estLow: est?.low, estHigh: est?.high,
          name, phone, email: email.trim() || undefined, preferredDate: date, notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送信に失敗しました');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
        <h3 className="text-lg font-black text-navy-800">陸送のお申し込みを受け付けました</h3>
        <p className="mt-1 text-sm text-slate-500">
          担当がZEROへ手配し、正式なお見積り・集荷日をご連絡します（通常1〜2営業日）。
          ご連絡先：{phone}{email ? ` / ${email}` : ''}
        </p>
      </div>
    );
  }

  const sizeLabel = CAR_SIZES.find((s) => s.value === size)?.label ?? '';

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-navy-500" />
        <h2 className="text-lg font-black text-navy-800">陸送料金シミュレーション</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">出発地（今ある場所）</label>
          <select className="input" value={fromPref} onChange={(e) => { setFromPref(e.target.value); setEst(null); }}>
            <option value="">選択してください</option>
            {TRANSPORT_PREFS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">到着地（届け先）</label>
          <select className="input" value={toPref} onChange={(e) => { setToPref(e.target.value); setEst(null); }}>
            <option value="">選択してください</option>
            {TRANSPORT_PREFS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">車のサイズ</label>
          <select className="input" value={size} onChange={(e) => { setSize(e.target.value); setEst(null); }}>
            {CAR_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <button type="button" onClick={simulate} className="btn-primary mt-4 w-full sm:w-auto sm:px-8">
        <Calculator className="h-4 w-4" /> 概算料金を計算する
      </button>

      {/* 結果 */}
      {est && (
        <div className="mt-5 rounded-2xl border-2 border-navy-500 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-navy-700">
            <Truck className="h-4 w-4" /> {fromPref} → {toPref}（{sizeLabel}）
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">概算料金（片道・キャリアカー）</p>
          <p className="text-center text-3xl font-black text-navy-800">
            {formatYen(est.low)} 〜 {formatYen(est.high)}
          </p>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-700">
            ※ 目安金額です。正式なお見積りは、車両・集荷場所・日程により担当（ZERO手配）がご案内します。
          </p>
          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-accent mt-3 flex w-full items-center justify-center gap-1.5">
              この内容で陸送を申し込む <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* 申込フォーム */}
      {est && showForm && (
        <form onSubmit={submit} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <h3 className="font-bold text-slate-700">陸送のお申し込み（ZERO手配）</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">お名前 *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" />
            </div>
            <div>
              <label className="label">電話番号 *</label>
              <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09012345678" />
            </div>
            <div>
              <label className="label">メールアドレス</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="任意" />
            </div>
            <div>
              <label className="label">希望集荷日</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">備考（集荷場所の詳細・ご要望など）</label>
            <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例：マンション駐車場、平日午前希望 など" />
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '送信中…' : 'この内容で申し込む'}
          </button>
          <p className="text-center text-xs text-slate-400">
            {fromPref} → {toPref} / {sizeLabel} / 概算 {est ? `${formatYen(est.low)}〜${formatYen(est.high)}` : ''} を引き継いで送信します。
          </p>
        </form>
      )}

      {est && !showForm && error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {!est && error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
