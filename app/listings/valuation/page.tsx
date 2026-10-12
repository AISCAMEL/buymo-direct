'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calculator, TrendingDown, Loader2, ClipboardCheck, ArrowRight, ShieldCheck, Tag, BarChart3, Sparkles, Camera, X, ScanLine } from 'lucide-react';
import { VEHICLE_CATALOG, CATALOG_MAKERS } from '@/lib/vehicle-catalog';
import { MILEAGE_OPTIONS } from '@/lib/mileage';
import { COLORS, PREFECTURES } from '@/lib/constants';
import { OPTION_KEYS } from '@/lib/valuation';
import { formatYen } from '@/lib/format';
import { PriceGuide } from '@/components/PriceGuide';
import { PriceHistogram, PriceTrend } from '@/components/ValuationCharts';

type PhotoDiagnosis = { condition: 'excellent' | 'good' | 'fair'; accidentHint: 'none' | 'possible' | 'unknown'; summary: string; points: string[] };

// 画像を縮小してbase64（data部分のみ）に変換する。
async function fileToDownscaledBase64(file: File, maxSide = 1024): Promise<{ mediaType: string; dataBase64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return { mediaType: 'image/jpeg', dataBase64: dataUrl.split(',')[1] ?? '' };
}

type ValuationFactor = { label: string; impact: number; note?: string };
type ValuationResult = {
  lower: number; upper: number; est: number;
  retailLower: number; retailUpper: number; retailEst: number;
  source: 'ai' | 'formula'; reasoning?: string; marketComment?: string;
  confidence: 'high' | 'medium' | 'low'; sampleCount: number;
  recommend: 'direct' | 'buyback' | 'either'; factors: ValuationFactor[];
  histogram: { label: string; count: number }[];
  trend: { label: string; value: number }[];
};

const CONFIDENCE_LABEL: Record<'high' | 'medium' | 'low', { t: string; cls: string }> = {
  high: { t: '信頼度 高', cls: 'bg-emerald-50 text-emerald-700' },
  medium: { t: '信頼度 中', cls: 'bg-amber-50 text-amber-700' },
  low: { t: '信頼度 参考', cls: 'bg-slate-100 text-slate-500' },
};

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
  const [otherModel, setOtherModel] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [year, setYear] = useState(CURRENT_YEAR - 5);
  const [mileage, setMileage] = useState<number | ''>('');
  const [condition, setCondition] = useState('good');
  const [shaken, setShaken] = useState<'valid' | 'none'>('valid');
  const [accident, setAccident] = useState<'none' | 'repaired'>('none');
  // 追加情報（任意・精度向上）
  const [grade, setGrade] = useState('');
  const [color, setColor] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  // 写真AI診断
  const [photos, setPhotos] = useState<{ mediaType: string; dataBase64: string }[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<PhotoDiagnosis | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOption(o: string) {
    setOptions((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - photos.length);
    e.target.value = '';
    if (files.length === 0) return;
    setDiagError(null);
    try {
      const added = await Promise.all(files.map((f) => fileToDownscaledBase64(f)));
      setPhotos((p) => [...p, ...added].slice(0, 3));
      setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))].slice(0, 3));
    } catch {
      setDiagError('画像の読み込みに失敗しました。');
    }
  }

  async function diagnosePhotos() {
    if (photos.length === 0) return;
    setDiagnosing(true); setDiagError(null); setDiagnosis(null);
    try {
      const res = await fetch('/api/valuation/photo-diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: photos }),
      });
      const data = await res.json();
      if (!data.available) { setDiagError(data.error ?? 'AI画像診断はご利用いただけません。'); return; }
      if (data.error) { setDiagError(data.error); return; }
      setDiagnosis({ condition: data.condition, accidentHint: data.accidentHint, summary: data.summary, points: data.points ?? [] });
    } catch {
      setDiagError('AI画像診断に失敗しました。');
    } finally {
      setDiagnosing(false);
    }
  }

  function applyDiagnosis() {
    if (!diagnosis) return;
    setCondition(diagnosis.condition);
    if (diagnosis.accidentHint === 'possible') setAccident('repaired');
  }

  // メーカー選択に応じて車名候補を取得（DB＋実出品＋AIで自動更新されるマスタ）
  useEffect(() => {
    if (!maker) { setModelOptions([]); return; }
    const fallback = (VEHICLE_CATALOG[maker] ?? []).filter((m) => m !== 'その他');
    setModelOptions(fallback);
    let cancelled = false;
    fetch(`/api/models?maker=${encodeURIComponent(maker)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { models?: string[] } | null) => {
        if (!cancelled && d?.models?.length) setModelOptions(d.models);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [maker]);

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
        body: JSON.stringify({
          maker, model: model.trim() || undefined, year, mileageKm: Number(mileage), condition, shaken, accident,
          grade: grade.trim() || undefined, color: color || undefined,
          options: options.length ? options : undefined, region: region || undefined,
        }),
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
              <select required className="input" value={maker} onChange={(e) => { setMaker(e.target.value); setModel(''); setOtherModel(false); }}>
                <option value="">選択してください</option>
                {CATALOG_MAKERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">車名（車種）</label>
              <select
                className="input"
                value={otherModel ? '__other__' : model}
                disabled={!maker}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__other__') { setOtherModel(true); setModel(''); }
                  else { setOtherModel(false); setModel(v); }
                }}
              >
                <option value="">{maker ? '選択してください' : '先にメーカーを選択'}</option>
                {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                {maker && <option value="__other__">その他（一覧にない）</option>}
              </select>
              {otherModel && (
                <input
                  type="text"
                  className="input mt-2"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="車名を入力"
                  autoComplete="off"
                />
              )}
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
              <label className="label">走行距離</label>
              <select
                className="input"
                value={mileage === '' ? '' : mileage}
                onChange={(e) => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">選択してください</option>
                {MILEAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
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

          {/* 追加情報（任意・精度アップ） */}
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-bold text-navy-700">追加情報を入力して精度を上げる（任意）</summary>
            <div className="mt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">グレード</label>
                  <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="例）Sツーリング" />
                </div>
                <div>
                  <label className="label">色</label>
                  <select className="input" value={color} onChange={(e) => setColor(e.target.value)}>
                    <option value="">指定なし</option>
                    {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">地域</label>
                  <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="">指定なし</option>
                    {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">装備・オプション</label>
                <div className="flex flex-wrap gap-2">
                  {OPTION_KEYS.map((o) => (
                    <button type="button" key={o} onClick={() => toggleOption(o)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${options.includes(o) ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {/* 写真からAI状態診断 */}
          <div className="rounded-xl border border-accent-100 bg-accent-50/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-black text-accent-700"><ScanLine className="h-4 w-4" /> 写真からAIが状態を診断</p>
            <p className="mt-1 text-xs text-slate-500">外装・内装の写真（最大3枚）をアップすると、AIがコンディションを推定します。査定に反映できます。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => { setPhotos((p) => p.filter((_, j) => j !== i)); setPreviews((p) => p.filter((_, j) => j !== i)); setDiagnosis(null); }}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {photos.length < 3 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:bg-slate-50">
                  <Camera className="h-5 w-5" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />
                </label>
              )}
            </div>
            {photos.length > 0 && (
              <button type="button" onClick={diagnosePhotos} disabled={diagnosing}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-600 disabled:opacity-50">
                {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AIで状態を診断する
              </button>
            )}
            {diagError && <p className="mt-2 text-xs text-slate-500">{diagError}</p>}
            {diagnosis && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="font-bold text-slate-700">
                  AI判定：{diagnosis.condition === 'excellent' ? '優良' : diagnosis.condition === 'fair' ? '普通' : '良好'}
                  {diagnosis.accidentHint === 'possible' && <span className="ml-2 text-xs font-bold text-amber-600">事故・修復の可能性</span>}
                </p>
                {diagnosis.summary && <p className="mt-1 text-xs text-slate-600">{diagnosis.summary}</p>}
                {diagnosis.points.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                    {diagnosis.points.map((p, i) => <li key={i}>・{p}</li>)}
                  </ul>
                )}
                <button type="button" onClick={applyDiagnosis} className="mt-2 rounded-lg border border-accent-300 px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-50">
                  この診断を査定に反映する
                </button>
                <p className="mt-1.5 text-[11px] text-slate-400">※ 写真は保存されません。推定のため実査定と異なる場合があります。</p>
              </div>
            )}
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
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-black">
            <TrendingDown className="h-5 w-5 text-navy-500" /> AI査定結果
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${result.source === 'ai' ? 'bg-accent-50 text-accent-600' : 'bg-slate-100 text-slate-500'}`}>
              {result.source === 'ai' ? 'AI査定' : '相場計算'}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CONFIDENCE_LABEL[result.confidence].cls}`}>
              {CONFIDENCE_LABEL[result.confidence].t}
            </span>
          </h2>

          {/* 2つのレンジ：買取 と ダイレクト販売 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border p-4 text-center ${result.recommend === 'buyback' ? 'border-navy-400 bg-navy-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> 買取目安（すぐ現金化）</p>
              <p className="mt-1 text-2xl font-black text-navy-700">{formatYen(result.lower)}<span className="text-sm">〜</span>{formatYen(result.upper)}</p>
              <p className="mt-0.5 text-xs text-slate-400">中央値 {formatYen(result.est)}・手数料0円</p>
              {result.recommend === 'buyback' && <span className="mt-1 inline-block rounded-full bg-navy-600 px-2 py-0.5 text-[10px] font-black text-white">おすすめ</span>}
            </div>
            <div className={`rounded-xl border p-4 text-center ${result.recommend === 'direct' ? 'border-gold-400 bg-gold-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500"><Tag className="h-3.5 w-3.5" /> ダイレクト販売目安（高く売る）</p>
              <p className="mt-1 text-2xl font-black text-gold-700">{formatYen(result.retailLower)}<span className="text-sm">〜</span>{formatYen(result.retailUpper)}</p>
              <p className="mt-0.5 text-xs text-slate-400">中央値 {formatYen(result.retailEst)}・買取保証つき</p>
              {result.recommend === 'direct' && <span className="mt-1 inline-block rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-black text-navy-900">おすすめ</span>}
            </div>
          </div>

          {/* 参照データ・コメント */}
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <BarChart3 className="h-3.5 w-3.5" />
              {result.sampleCount > 0 ? `同条件の現役出品 ${result.sampleCount}台の実勢を反映` : '出品データが少ないため計算式ベースの参考値'}
            </p>
            {result.reasoning && <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-slate-600"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />{result.reasoning}</p>}
            {result.marketComment && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{result.marketComment}</p>}
          </div>

          {/* 価格の内訳（説明可能な査定） */}
          {result.factors.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-sm font-black text-slate-700">価格に影響した要因</p>
              <ul className="divide-y divide-slate-100 text-sm">
                {result.factors.map((f) => (
                  <li key={f.label} className="flex items-center justify-between gap-2 py-1.5">
                    <div>
                      <p className="font-bold text-slate-700">{f.label}</p>
                      {f.note && <p className="text-[11px] text-slate-400">{f.note}</p>}
                    </div>
                    <span className={`shrink-0 font-black tabular-nums ${f.impact < 0 ? 'text-red-500' : f.impact > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {f.impact > 0 ? '+' : ''}{formatYen(f.impact)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-400">※ 新車相当価格からの増減（ダイレクト販売相場ベースの概算）。</p>
            </div>
          )}

          {/* 相場分布・トレンドのグラフ */}
          {result.histogram.length > 0 && <PriceHistogram buckets={result.histogram} />}
          {result.trend.length >= 2 && <PriceTrend points={result.trend} />}

          {/* 実際の掲載相場（BUYMOの現役出品から・AI査定の裏付け） */}
          <PriceGuide maker={maker} model={otherModel ? undefined : model} year={year} />

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

          {/* 正式査定へ進む（詳細情報を入力して担当が確定金額を提示） */}
          <div className="rounded-xl border-2 border-navy-500 bg-white p-4">
            <p className="flex items-center gap-1.5 text-sm font-black text-navy-800">
              <ClipboardCheck className="h-4 w-4 text-navy-500" /> この査定額から「正式査定」に進めます
            </p>
            <p className="mt-1 text-xs text-slate-600">
              次の画面で<span className="font-bold">車両の詳細と写真</span>をご入力いただくと、担当が<span className="font-bold">確定金額</span>をご案内します（無料・キャンセル可）。上のAI査定額・車両情報は引き継がれます。
            </p>
            <Link
              href={`/sell/appraisal?${new URLSearchParams({
                maker,
                model: otherModel ? '' : model,
                year: String(year),
                mileageKm: String(mileage || 0),
                condition,
                aiLow: String(result.lower),
                aiHigh: String(result.upper),
                retailLow: String(result.retailLower),
                retailHigh: String(result.retailUpper),
                ...(grade ? { grade } : {}),
                ...(color ? { color } : {}),
                ...(region ? { region } : {}),
              }).toString()}`}
              className="btn-accent mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-sm"
            >
              正式査定に進む（詳細入力・無料） <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-2 text-center text-xs text-slate-400">
              入力した情報は、あとで「ダイレクト販売」に切り替える際もそのまま使えます。
            </p>
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
