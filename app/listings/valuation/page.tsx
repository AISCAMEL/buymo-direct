'use client';

import { useState } from 'react';
import { Calculator, TrendingDown, Loader2 } from 'lucide-react';
import { MAKERS } from '@/lib/constants';
import { formatYen } from '@/lib/format';

type ValuationResult = { lower: number; upper: number; est: number; source: 'ai' | 'formula'; reasoning?: string };

// 西暦→和暦（車の年式選択用の簡易変換）
function wareki(y: number): string {
  if (y >= 2019) { const n = y - 2018; return `令和${n === 1 ? '元' : n}年`; }
  if (y >= 1989) { const n = y - 1988; return `平成${n === 1 ? '元' : n}年`; }
  const n = y - 1925; return `昭和${n === 1 ? '元' : n}年`;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);

export default function ValuationPage() {
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR - 5);
  const [mileage, setMileage] = useState<number | ''>('');
  const [condition, setCondition] = useState('good');
  const [shaken, setShaken] = useState<'valid' | 'none'>('valid');
  const [accident, setAccident] = useState<'none' | 'repaired'>('none');
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calc(e: React.FormEvent) {
    e.preventDefault();
    if (!maker || loading) return;
    if (mileage === '' || Number(mileage) < 0) { setError('走行距離を入力してください。'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maker, model: model.trim() || undefined, year, mileageKm: Number(mileage), condition, shaken, accident }),
      });
      if (!res.ok) throw new Error('failed');
      setResult((await res.json()) as ValuationResult);
    } catch {
      setError('査定に失敗しました。時間をおいて再度お試しください。');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-navy-500" />
        <div>
          <h1 className="text-2xl font-black">無料査定・相場チェック</h1>
          <p className="text-sm text-slate-500">登録不要。売るなら、もっと高く。</p>
        </div>
      </div>

      <div className="card p-5">
        <p className="mb-4 text-sm text-slate-500">
          メーカー・年式・走行距離から市場相場の目安を算出します。
          実際の売却価格は車両状態・需給により異なります。査定は無料・引取り無料です。
        </p>

        <form onSubmit={calc} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">メーカー *</label>
              <select required className="input" value={maker} onChange={(e) => { setMaker(e.target.value); setModel(''); }}>
                <option value="">選択してください</option>
                {Object.keys(MAKERS).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">車名（車種）</label>
              <input
                type="text"
                list="model-options"
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={maker ? '例）プリウス' : '先にメーカーを選択'}
                disabled={!maker}
                autoComplete="off"
              />
              <datalist id="model-options">
                {(MAKERS[maker] ?? []).filter((m) => m !== 'その他').map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">年式</label>
              <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}年（{wareki(y)}）</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">走行距離(km)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="例）50000"
                className="input"
                value={mileage}
                onChange={(e) => setMileage(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[10000, 30000, 50000, 80000, 100000].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setMileage(km)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold transition ${mileage === km ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {km / 10000}万km
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">車両コンディション</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'excellent', label: '優良', desc: '無事故・低走行' },
                { value: 'good', label: '良好', desc: '一般的な状態' },
                { value: 'fair', label: '普通', desc: '多少の傷・使用感あり' },
              ].map((c) => (
                <label key={c.value} className={`cursor-pointer rounded-lg border p-3 text-center transition ${condition === c.value ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" className="sr-only" value={c.value} checked={condition === c.value} onChange={() => setCondition(c.value)} />
                  <p className="text-sm font-bold">{c.label}</p>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">車検</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'valid' as const, label: '車検あり', desc: '有効期間が残っている' },
                  { value: 'none' as const, label: '車検なし', desc: '切れ・残りわずか' },
                ].map((o) => (
                  <label key={o.value} className={`cursor-pointer rounded-lg border p-3 text-center transition ${shaken === o.value ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" className="sr-only" checked={shaken === o.value} onChange={() => setShaken(o.value)} />
                    <p className="text-sm font-bold">{o.label}</p>
                    <p className="text-xs text-slate-400">{o.desc}</p>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">事故歴（修復歴）</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'none' as const, label: 'なし', desc: '無事故・修復歴なし' },
                  { value: 'repaired' as const, label: '修復歴あり', desc: '事故・修復歴あり' },
                ].map((o) => (
                  <label key={o.value} className={`cursor-pointer rounded-lg border p-3 text-center transition ${accident === o.value ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" className="sr-only" checked={accident === o.value} onChange={() => setAccident(o.value)} />
                    <p className="text-sm font-bold">{o.label}</p>
                    <p className="text-xs text-slate-400">{o.desc}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-accent w-full disabled:opacity-60">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> 査定中...</>
            ) : (
              <><Calculator className="h-4 w-4" /> 査定額を計算する</>
            )}
          </button>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
        </form>
      </div>

      {result && (
        <div className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <TrendingDown className="h-5 w-5 text-navy-500" /> 査定結果
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${result.source === 'ai' ? 'bg-accent-50 text-accent-600' : 'bg-slate-100 text-slate-500'}`}>
              {result.source === 'ai' ? 'AI査定' : '相場計算'}
            </span>
          </h2>

          <div className="rounded-xl bg-navy-50 p-5 text-center">
            <p className="text-sm text-slate-500">推定相場レンジ</p>
            <p className="mt-1 text-3xl font-black text-navy-700">
              {formatYen(result.lower)} 〜 {formatYen(result.upper)}
            </p>
            <p className="mt-1 text-sm text-slate-400">中央値：{formatYen(result.est)}</p>
            {result.reasoning && (
              <p className="mt-3 border-t border-navy-100 pt-3 text-left text-xs leading-relaxed text-slate-600">
                {result.reasoning}
              </p>
            )}
          </div>

          {/* 売却コンバージョン（価格訴求） */}
          <div className="rounded-xl border border-gold-200 bg-gold-50 p-4">
            <p className="text-sm font-black text-slate-800">ダイレクト販売なら、この相場より高く売れることも。</p>
            <p className="mt-1 text-xs text-slate-600">
              購入者へ直接販売してより高く。売れなくてもBUYMOが買い取る「買取保証つき」なので安心です。すぐ現金化したい方は買取もどうぞ。
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a href="/sell" className="btn-gold flex-1 justify-center py-2.5 text-sm">
                この車を出品する（ダイレクト）
              </a>
              <a href="/dashboard/buyback" className="btn-outline flex-1 justify-center py-2.5 text-sm">
                買取を申し込む
              </a>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            ※ この査定額は簡易計算による目安です。実際の市場価格は車両状態・オプション・地域の需給等により大きく異なります。
            正確な査定は無料でご依頼いただけます。
          </div>

          <a href={`/listings?maker=${encodeURIComponent(maker)}&year_min=${year - 1}&year_max=${year + 1}`}
            className="block text-center text-sm font-bold text-accent-600 hover:underline">
            {maker} {year}年の出品を探す →
          </a>
        </div>
      )}
    </div>
  );
}
