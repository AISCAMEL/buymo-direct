'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Plus, X, Printer } from 'lucide-react';
import Link from 'next/link';
import { SELL_TIMING, MOTIVES, type CompetitorQuote } from '@/lib/hearing';

export function HearingForm({ dealerId, storeLabel }: { dealerId?: string; storeLabel?: string }) {
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [plate, setPlate] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorQuote[]>([{ name: '', price: '' }]);
  const [hope, setHope] = useState('');
  const [timing, setTiming] = useState('');
  const [motives, setMotives] = useState<string[]>([]);
  const [situation, setSituation] = useState('');
  const [condition, setCondition] = useState('');
  const [requests, setRequests] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  function toggleMotive(m: string) {
    setMotives((xs) => (xs.includes(m) ? xs.filter((x) => x !== m) : [...xs, m]));
  }

  async function submit() {
    setErr('');
    if (!name.trim() && !tel.trim()) { setErr('お名前または連絡先を入力してください。'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/hearing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: dealerId || null, storeLabel: storeLabel || null, source: 'web',
          customerName: name, tel, maker, model, modelYear: year, mileageKm: mileage, plate,
          hearing: {
            competitors: competitors.filter((c) => c.name || c.price),
            hopePrice: hope, sellTiming: timing, motives, situation, conditionNote: condition, requests,
          },
        }),
      });
      const j = await res.json();
      if (j.ok) setDone(true); else setErr(j.error || '送信に失敗しました。');
    } catch { setErr('通信に失敗しました。'); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-3 text-2xl font-black text-navy-800">送信しました</h1>
        <p className="mt-2 text-sm text-slate-500">ヒアリング内容をお預かりしました。担当よりご連絡・ご案内いたします。ありがとうございました。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-24">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-accent-600">Hearing</p>
        <h1 className="mt-1 text-2xl font-black text-navy-800">査定ヒアリングシート</h1>
        <p className="mt-1 text-sm text-slate-500">{storeLabel ? `${storeLabel}｜` : ''}分かる範囲でご記入ください（空欄OK）。より正確・より高い査定のための聞き取りです。</p>
        <Link href="/hearing/print" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600"><Printer className="h-3.5 w-3.5" />紙に記入する用（印刷）</Link>
      </header>

      <Section title="お客様・お車">
        <div className="grid grid-cols-2 gap-3">
          <F label="お名前" value={name} onChange={setName} />
          <F label="連絡先（電話）" value={tel} onChange={setTel} inputMode="tel" />
          <F label="メーカー" value={maker} onChange={setMaker} />
          <F label="車種" value={model} onChange={setModel} />
          <F label="年式" value={year} onChange={setYear} numeric />
          <F label="走行(km)" value={mileage} onChange={setMileage} numeric />
          <F label="ナンバー" value={plate} onChange={setPlate} />
        </div>
      </Section>

      <Section title="他社の査定額（比較）">
        <div className="space-y-2">
          {competitors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c.name} onChange={(e) => setCompetitors((xs) => xs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="他社名" className="input h-10 flex-1 text-sm" />
              <input value={c.price} onChange={(e) => setCompetitors((xs) => xs.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="金額（円）" inputMode="numeric" className="input h-10 w-32 text-sm" />
              {competitors.length > 1 && <button type="button" onClick={() => setCompetitors((xs) => xs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          <button type="button" onClick={() => setCompetitors((xs) => [...xs, { name: '', price: '' }])} className="inline-flex items-center gap-1 text-sm font-bold text-accent-600"><Plus className="h-4 w-4" />他社を追加</button>
        </div>
      </Section>

      <Section title="ご希望・ご状況">
        <F label="希望金額（あれば）" value={hope} onChange={setHope} inputMode="numeric" />
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-bold text-slate-700">売却時期</p>
          <div className="flex flex-wrap gap-2">
            {SELL_TIMING.map((t) => (
              <button key={t} type="button" onClick={() => setTiming(timing === t ? '' : t)} className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${timing === t ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-200 text-slate-600'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-bold text-slate-700">売却の理由（複数可）</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVES.map((m) => (
              <button key={m} type="button" onClick={() => toggleMotive(m)} className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${motives.includes(m) ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 text-slate-600'}`}>{m}</button>
            ))}
          </div>
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-bold text-slate-700">現在の状況（他社と商談中／比較中 など）</span>
          <input value={situation} onChange={(e) => setSituation(e.target.value)} className="input mt-1 h-10 w-full text-sm" />
        </label>
      </Section>

      <Section title="車両の状態・ご要望">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">気になる傷・不具合・修復歴など</span>
          <textarea value={condition} onChange={(e) => setCondition(e.target.value)} rows={3} className="input mt-1 w-full text-sm" />
        </label>
        <label className="mt-3 block">
          <span className="text-sm font-bold text-slate-700">その他ご要望・ご質問</span>
          <textarea value={requests} onChange={(e) => setRequests(e.target.value)} rows={2} className="input mt-1 w-full text-sm" />
        </label>
      </Section>

      {err && <p className="text-sm font-bold text-red-600">{err}</p>}
      <button onClick={submit} disabled={busy} className="btn-accent inline-flex w-full items-center justify-center gap-1.5 py-3 text-base disabled:opacity-50">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} この内容で送信する
      </button>
      <p className="text-center text-xs text-slate-400">送信いただいた内容は査定・ご提案のために使用します。</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 font-black text-navy-800">{title}</h2>
      {children}
    </section>
  );
}
function F({ label, value, onChange, numeric, inputMode }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean; inputMode?: 'tel' | 'numeric' }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode ?? (numeric ? 'numeric' : undefined)} className="input mt-0.5 h-10 w-full text-sm" />
    </label>
  );
}
