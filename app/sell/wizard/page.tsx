'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Bot, ShieldCheck, Users, Sparkles } from 'lucide-react';
import { VEHICLE_CATALOG, CATALOG_MAKERS } from '@/lib/vehicle-catalog';
import { formatYen } from '@/lib/format';

// 西暦→和暦
function wareki(y: number): string {
  if (y >= 2019) { const n = y - 2018; return `令和${n === 1 ? '元' : n}年`; }
  if (y >= 1989) { const n = y - 1988; return `平成${n === 1 ? '元' : n}年`; }
  const n = y - 1925; return `昭和${n === 1 ? '元' : n}年`;
}

type Step = 'info' | 'analyzing' | 'result' | 'type';

type CarInfo = {
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
};

type Estimate = {
  price_low: number;
  price_high: number;
  buyback_price: number;
  reasoning: string;
};

const CONDITIONS = [
  { value: 'excellent', label: '✨ 極上', desc: '無傷・無修復・記録簿完備' },
  { value: 'good',      label: '👍 良好', desc: '軽微な傷のみ、普通に使用' },
  { value: 'fair',      label: '😊 普通', desc: '使用感あり、修復歴なし' },
  { value: 'poor',      label: '⚠️ 難あり', desc: '修復歴・大きな傷・不具合' },
];

// ルールベース推定（API未接続時のフォールバック）
function localEstimate(info: CarInfo): Estimate {
  const BASE: Record<string, number> = {
    レクサス: 5500000, トヨタ: 2800000, ホンダ: 2400000, 日産: 2200000,
    マツダ: 2200000, スバル: 2300000, 三菱: 2000000, スズキ: 1300000,
    ダイハツ: 1200000, 輸入車: 4200000,
  };
  const base = BASE[info.maker] ?? 2000000;
  const age = new Date().getFullYear() - info.year;

  let residual = 1.0;
  for (let i = 0; i < age; i++) {
    residual *= (1 - (i < 3 ? 0.18 : i < 6 ? 0.12 : 0.08));
  }
  const stdMileage = age * 15000;
  const mileageFactor = Math.max(0.4, 1 - Math.max(0, info.mileage_km - stdMileage) * 0.000008);
  const condFactor = { excellent: 1.15, good: 1.0, fair: 0.82, poor: 0.6 }[info.condition];

  const est = base * residual * mileageFactor * condFactor;
  const price_low  = Math.max(50000,  Math.round(est * 0.87 / 10000) * 10000);
  const price_high = Math.max(100000, Math.round(est * 1.13 / 10000) * 10000);
  const mid = (price_low + price_high) / 2;
  const buyback_price = Math.round(mid * 0.75 / 10000) * 10000;

  const REASONS = [
    `${info.maker}の${info.year}年式は流通量が多く、安定した需要があります。`,
    `走行距離${(info.mileage_km / 10000).toFixed(1)}万km・コンディション「${CONDITIONS.find(c => c.value === info.condition)?.label}」を反映した査定です。`,
    `現在の中古車市場では${info.maker}の人気が高く、適正価格での売却が期待できます。`,
  ];
  return { price_low, price_high, buyback_price, reasoning: REASONS[Math.floor(age / 5) % 3] };
}

const STEPS = ['車両情報', 'AI分析', '査定結果', '出品方法'];

export default function SellWizardPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [step, setStep] = useState<Step>('info');
  const [info, setInfo] = useState<CarInfo>({
    maker: '', model: '', year: currentYear - 3, mileage_km: 30000, condition: 'good',
  });
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [listingType, setListingType] = useState<'direct' | 'proxy'>('direct');
  const [error, setError] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [otherModel, setOtherModel] = useState(false);

  // メーカー選択に応じて車名候補を取得（DB＋実出品＋AIで自動更新）
  useEffect(() => {
    if (!info.maker) { setModelOptions([]); return; }
    setModelOptions((VEHICLE_CATALOG[info.maker] ?? []).filter((m) => m !== 'その他'));
    let cancelled = false;
    fetch(`/api/models?maker=${encodeURIComponent(info.maker)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { models?: string[] } | null) => { if (!cancelled && d?.models?.length) setModelOptions(d.models); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [info.maker]);

  const stepIdx = { info: 0, analyzing: 1, result: 2, type: 3 }[step];

  async function analyze() {
    if (!info.maker || !info.model) { setError('メーカーと車種を入力してください'); return; }
    setError('');
    setStep('analyzing');
    try {
      const res = await fetch('/api/ai/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maker: info.maker, model: info.model, year: info.year, mileage_km: info.mileage_km, condition: info.condition }),
      });
      if (res.ok) {
        const data = await res.json() as { price_low: number; price_high: number; reasoning: string };
        const mid = (data.price_low + data.price_high) / 2;
        setEstimate({ ...data, buyback_price: Math.round(mid * 0.75 / 10000) * 10000 });
      } else {
        setEstimate(localEstimate(info));
      }
    } catch {
      setEstimate(localEstimate(info));
    }
    setTimeout(() => setStep('result'), 1800);
  }

  function goSell() {
    if (!estimate) return;
    const params = new URLSearchParams({
      maker: info.maker,
      model: info.model,
      year: String(info.year),
      mileage_km: String(info.mileage_km),
      ai_price_min: String(estimate.price_low),
      ai_price_max: String(estimate.price_high),
      listing_type: listingType,
    });
    router.push('/sell?' + params.toString());
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
                style={{
                  background: i < stepIdx ? '#22c55e' : i === stepIdx ? '#0F766E' : '#e5e7eb',
                  color: i <= stepIdx ? '#fff' : '#9ca3af',
                }}
              >
                {i < stepIdx ? '✓' : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${i === stepIdx ? 'font-bold text-navy-800' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mb-4 mx-1" style={{ background: i < stepIdx ? '#22c55e' : '#e5e7eb' }} />
            )}
          </div>
        ))}
      </div>

      {/* STEP 1: 車両情報入力 */}
      {step === 'info' && (
        <div className="card p-6 space-y-5">
          <div>
            <h1 className="text-xl font-black text-navy-800 mb-0.5">🔍 出品前AI相場診断</h1>
            <p className="text-sm text-slate-500">まず車両情報を入力して、適正価格を確認しましょう</p>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">メーカー *</label>
              <select className="input" value={info.maker} onChange={e => { setInfo({ ...info, maker: e.target.value, model: '' }); setOtherModel(false); }} required>
                <option value="">選択してください</option>
                {CATALOG_MAKERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">車種・グレード *</label>
              <select
                className="input"
                value={otherModel ? '__other__' : info.model}
                disabled={!info.maker}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '__other__') { setOtherModel(true); setInfo({ ...info, model: '' }); }
                  else { setOtherModel(false); setInfo({ ...info, model: v }); }
                }}
              >
                <option value="">{info.maker ? '選択してください' : '先にメーカーを選択'}</option>
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                {info.maker && <option value="__other__">その他（一覧にない）</option>}
              </select>
              {otherModel && (
                <input
                  className="input mt-2" type="text" placeholder="車種・グレードを入力（例: プリウス Z）"
                  value={info.model} onChange={e => setInfo({ ...info, model: e.target.value })} autoComplete="off"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">年式 *</label>
              <select className="input" value={info.year} onChange={e => setInfo({ ...info, year: Number(e.target.value) })}>
                {Array.from({ length: 37 }, (_, i) => currentYear - i).map(y => (
                  <option key={y} value={y}>{y}年（{wareki(y)}）</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">走行距離 *</label>
              <div className="relative">
                <input
                  className="input pr-8" type="number" min={0} step={1000} inputMode="numeric"
                  value={info.mileage_km} onFocus={e => e.target.select()}
                  onChange={e => setInfo({ ...info, mileage_km: Math.max(0, Number(e.target.value)) })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">km</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[10000, 30000, 50000, 80000, 100000].map(km => (
                  <button
                    key={km} type="button" onClick={() => setInfo({ ...info, mileage_km: km })}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold transition ${info.mileage_km === km ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {km / 10000}万km
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">車両状態 *</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map(c => (
                <label
                  key={c.value}
                  className="flex cursor-pointer gap-2 rounded-xl border-2 p-3 transition-colors"
                  style={{
                    borderColor: info.condition === c.value ? '#0F766E' : '#e5e7eb',
                    background: info.condition === c.value ? '#E6F2EF' : '#fff',
                  }}
                >
                  <input type="radio" name="condition" value={c.value} className="mt-0.5"
                    checked={info.condition === c.value}
                    onChange={() => setInfo({ ...info, condition: c.value as CarInfo['condition'] })}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{c.label}</p>
                    <p className="text-xs text-slate-500">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={analyze}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <Bot className="h-4 w-4" />
            AIで相場を診断する
          </button>
        </div>
      )}

      {/* STEP 2: 分析中 */}
      {step === 'analyzing' && (
        <div className="card p-10 text-center space-y-5">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-navy-100" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-navy-700">
              <Bot className="h-9 w-9 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-black text-navy-800 mb-1">AIが相場を分析中...</h2>
            <p className="text-sm text-slate-500">
              {info.maker} {info.model}（{info.year}年式・{(info.mileage_km / 10000).toFixed(1)}万km）
            </p>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-slate-400">
            {['過去3ヶ月の取引データを参照中', '走行距離・年式から減価を計算中', '需要トレンドを反映中'].map(t => (
              <p key={t} className="flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />{t}
              </p>
            ))}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ width: '65%' }} />
          </div>
        </div>
      )}

      {/* STEP 3: 結果 */}
      {step === 'result' && estimate && (
        <div className="space-y-4">
          <div className="card p-6">
            <p className="text-sm text-slate-500 mb-0.5">{info.maker} {info.model}（{info.year}年式）</p>
            <h2 className="text-xl font-black text-navy-800 mb-4">AI査定結果</h2>

            {/* 相場レンジ */}
            <div className="rounded-2xl p-5 text-center mb-4"
              style={{ background: 'linear-gradient(135deg, #0C3A44, #0F766E)' }}>
              <p className="text-xs text-navy-200 mb-2">推定市場相場</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-white">{formatYen(estimate.price_low)}</span>
                <span className="text-slate-400">〜</span>
                <span className="text-2xl font-black text-white">{formatYen(estimate.price_high)}</span>
              </div>
              <p className="text-xs text-navy-200 mt-1">中央値: {formatYen(Math.round((estimate.price_low + estimate.price_high) / 2))}</p>
            </div>

            {/* 買取保証価格 */}
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
              <ShieldCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">買取保証価格</p>
                <p className="text-xl font-black text-amber-700">{formatYen(estimate.buyback_price)}</p>
                <p className="text-xs text-amber-600 mt-0.5">30日間売れなければこの価格でBUYMOが買取</p>
              </div>
            </div>

            {/* AIの根拠 */}
            {estimate.reasoning && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 flex gap-2">
                <Bot className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p>{estimate.reasoning}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep('type')}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            出品方法を選ぶ <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setStep('info')} className="w-full text-center text-sm text-slate-400 hover:text-slate-600">
            ← 条件を変えて再診断
          </button>
        </div>
      )}

      {/* STEP 4: 出品方法選択 */}
      {step === 'type' && estimate && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl font-black text-navy-800 mb-1">出品方法を選択</h2>
            <p className="text-sm text-slate-500 mb-5">手数料・サポート内容をご確認のうえ選択してください</p>

            <div className="space-y-3">
              {/* 直接取引 */}
              <label
                className="flex cursor-pointer gap-4 rounded-2xl border-2 p-5 transition-all"
                style={{
                  borderColor: listingType === 'direct' ? '#0F766E' : '#e5e7eb',
                  background: listingType === 'direct' ? '#E6F2EF' : '#fff',
                }}
              >
                <input type="radio" name="ltype" value="direct" className="mt-1"
                  checked={listingType === 'direct'} onChange={() => setListingType('direct')} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-navy-800 flex items-center gap-2">
                      <Users className="h-4 w-4" />自分で交渉する
                    </p>
                    <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-bold text-navy-700">手数料 3%</span>
                  </div>
                  <p className="text-sm text-slate-500">購入希望者と直接メッセージ。価格交渉もご自身で。</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500">
                    <span>✅ 手数料が安い</span>
                    <span>✅ 好きな価格で売れる</span>
                    <span>⚠️ 交渉・対応が必要</span>
                    <span>⚠️ 時間がかかることも</span>
                  </div>
                  {estimate && listingType === 'direct' && (
                    <div className="mt-3 rounded-lg bg-white border p-2 text-xs text-slate-600">
                      手取り目安: <strong>{formatYen(Math.round(((estimate.price_low + estimate.price_high) / 2) * 0.97))}</strong>
                    </div>
                  )}
                </div>
              </label>

              {/* 代理販売 */}
              <label
                className="flex cursor-pointer gap-4 rounded-2xl border-2 p-5 transition-all"
                style={{
                  borderColor: listingType === 'proxy' ? '#d97706' : '#e5e7eb',
                  background: listingType === 'proxy' ? '#fffbeb' : '#fff',
                }}
              >
                <input type="radio" name="ltype" value="proxy" className="mt-1"
                  checked={listingType === 'proxy'} onChange={() => setListingType('proxy')} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-amber-800 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />BUYMOに任せる
                    </p>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">手数料 7%</span>
                  </div>
                  <p className="text-sm text-slate-500">BUYMOスタッフが問い合わせ対応・交渉をすべて代行。</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500">
                    <span>✅ 手間ゼロ</span>
                    <span>✅ プロが交渉</span>
                    <span>✅ 安心サポート</span>
                    <span>⚠️ 手数料が高め</span>
                  </div>
                  {estimate && listingType === 'proxy' && (
                    <div className="mt-3 rounded-lg bg-white border p-2 text-xs text-slate-600">
                      手取り目安: <strong>{formatYen(Math.round(((estimate.price_low + estimate.price_high) / 2) * 0.93))}</strong>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* 買取保証リマインダー */}
          <div className="rounded-xl bg-slate-50 border p-4 text-sm text-slate-600 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-800">買取保証付き</strong>　出品後30日間売れなかった場合、
              <strong className="text-amber-700">{estimate ? formatYen(estimate.buyback_price) : '—'}</strong> でBUYMOが買取します。
            </p>
          </div>

          <button
            onClick={goSell}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {listingType === 'proxy' ? '🤝 代理販売で出品する' : '🚗 自分で出品する'}
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setStep('result')} className="w-full text-center text-sm text-slate-400 hover:text-slate-600">
            ← 査定結果に戻る
          </button>
        </div>
      )}
    </div>
  );
}
