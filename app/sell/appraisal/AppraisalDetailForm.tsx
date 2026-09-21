'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardCheck, ImagePlus, X, Check, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { CATALOG_MAKERS } from '@/lib/vehicle-catalog';
import { PREFECTURES, TRANSMISSIONS, FUELS, BODY_TYPES } from '@/lib/constants';
import { APPRAISAL_PHOTO_GUIDE, appraisalGuideIndex } from '@/lib/photo-guide';
import { DIAGNOSIS_QUESTIONS, SELL_TIMING_OPTIONS } from '@/lib/appraisal-diagnosis';
import { formatYen } from '@/lib/format';

const CURRENT_YEAR = new Date().getFullYear();
function wareki(year: number): string {
  if (year >= 2019) return `令和${year - 2018 === 1 ? '元' : year - 2018}年`;
  if (year >= 1989) return `平成${year - 1988 === 1 ? '元' : year - 1988}年`;
  return `昭和${year - 1925}年`;
}
const YEARS = Array.from({ length: CURRENT_YEAR - 1985 + 1 }, (_, i) => CURRENT_YEAR - i);

// 走行距離：1万km範囲で50万kmまで（値は代表値の km）
const MILEAGE_OPTIONS: { value: number; label: string }[] = [
  { value: 5000, label: '1万km未満' },
  ...Array.from({ length: 49 }, (_, i) => ({ value: (i + 1) * 10000 + 5000, label: `${i + 1}〜${i + 2}万km` })),
  { value: 505000, label: '50万km以上' },
];
function mileageToOption(km: number): number {
  if (!km || km <= 0) return 0;
  if (km < 10000) return 5000;
  if (km >= 500000) return 505000;
  const i = Math.floor(km / 10000);
  return i * 10000 + 5000;
}

const COLORS = ['パールホワイト', 'ホワイト', 'ブラック', 'シルバー', 'グレー', 'レッド', 'ブルー', 'ネイビー', 'グリーン', 'イエロー', 'オレンジ', 'ブラウン', 'ベージュ', 'ゴールド', 'パープル', 'ピンク', 'その他'];

const STEPS = ['車両情報', '車の詳細', '状態の問診', '写真', 'ご連絡先'];

type Photo = { key: string; url?: string; caption?: string; uploading?: boolean };

export function AppraisalDetailForm() {
  const sp = useSearchParams();
  const sidRef = useRef<string>(Math.random().toString(36).slice(2, 12));

  const [step, setStep] = useState(1);

  // AI査定から引き継ぎ
  const [maker, setMaker] = useState(sp.get('maker') ?? '');
  const [model, setModel] = useState(sp.get('model') ?? '');
  const [otherModel, setOtherModel] = useState('');
  const [year, setYear] = useState<number>(sp.get('year') ? Number(sp.get('year')) : CURRENT_YEAR - 5);
  const [mileageKm, setMileageKm] = useState<number>(sp.get('mileageKm') ? mileageToOption(Number(sp.get('mileageKm'))) : 0);
  const [prefecture, setPrefecture] = useState(sp.get('prefecture') ?? '');
  const aiLow = sp.get('aiLow') ? Number(sp.get('aiLow')) : null;
  const aiHigh = sp.get('aiHigh') ? Number(sp.get('aiHigh')) : null;
  const condition = sp.get('condition') ?? 'good';

  // 車名候補
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!maker) { setModelOptions([]); return; }
    let alive = true;
    fetch(`/api/models?maker=${encodeURIComponent(maker)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setModelOptions(Array.isArray(d.models) ? d.models : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [maker]);

  // 詳細
  const [grade, setGrade] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [vin, setVin] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuel, setFuel] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [colorChoice, setColorChoice] = useState('');
  const [colorOther, setColorOther] = useState('');
  const [shakenUntil, setShakenUntil] = useState('');
  const [repair, setRepair] = useState<'none' | 'yes'>('none');
  const [repairDetail, setRepairDetail] = useState('');
  const [oneOwner, setOneOwner] = useState(false);
  const [hasRecords, setHasRecords] = useState(false);
  const [nonSmoking, setNonSmoking] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');

  // 問診・売却時期
  const [diagnosis, setDiagnosis] = useState<Record<string, string>>({});
  const [sellTiming, setSellTiming] = useState('');

  // 連絡先
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredContact, setPreferredContact] = useState('どちらでも');

  // 写真
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const finalModel = model === '__other__' ? otherModel.trim() : model;
  const finalColor = colorChoice === 'その他' ? colorOther.trim() : colorChoice;
  const uploading = photos.some((p) => p.uploading);

  async function uploadFile(file: File, caption?: string) {
    const key = `${caption ?? 'extra'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setPhotos((prev) => [...prev.filter((p) => !(caption && p.caption === caption)), { key, caption, uploading: true }]);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('sid', sidRef.current);
      const res = await fetch('/api/appraisal/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'アップロードに失敗しました');
      setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, url: data.url, uploading: false } : p)));
    } catch (e) {
      setPhotos((prev) => prev.filter((p) => p.key !== key));
      setError(e instanceof Error ? e.message : '写真のアップロードに失敗しました');
    }
  }
  function onSlot(e: React.ChangeEvent<HTMLInputElement>, label: string) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, label);
    e.target.value = '';
  }
  function onExtra(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 25 - photos.length);
    files.forEach((f) => uploadFile(f));
    e.target.value = '';
  }
  function removePhoto(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  const orderedPhotos = useMemo(
    () => [...photos].sort((a, b) => appraisalGuideIndex(a.caption) - appraisalGuideIndex(b.caption)),
    [photos],
  );

  function goNext() {
    setError(null);
    if (step === 1 && !maker) { setError('メーカーを選択してください。'); return; }
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!maker) { setError('メーカーを選択してください。'); setStep(1); return; }
    if (!name.trim()) { setError('お名前を入力してください。'); return; }
    if (!phone.trim()) { setError('電話番号を入力してください。'); return; }
    if (uploading) { setError('写真のアップロード完了までお待ちください。'); return; }

    setSubmitting(true);
    try {
      const readyPhotos = photos.filter((p) => p.url).map((p) => ({ url: p.url!, caption: p.caption ?? null }));
      const res = await fetch('/api/appraisal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maker, model: finalModel || undefined, year, mileageKm, condition, prefecture,
          name, phone, email: email.trim() || undefined, preferredContact,
          notes,
          grade, typeCode, vin, transmission, fuel, bodyType, color: finalColor, shakenUntil,
          repairDetail: repair === 'yes' ? repairDetail : '',
          equipment,
          oneOwner, hasRecords, nonSmoking,
          diagnosis, sellTiming,
          photos: readyPhotos,
          aiLow, aiHigh,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送信に失敗しました');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-black text-navy-800">正式査定のお申し込みを受け付けました</h1>
          <p className="mt-2 text-sm text-slate-500">
            いただいた車両情報・写真をもとに担当が確認し、確定金額をご案内します（通常1〜2営業日）。
            ご連絡先：{phone}{email ? ` / ${email}` : ''}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-outline">トップへ戻る</Link>
            <Link href="/dashboard/appraisal" className="btn-primary">査定状況を見る（マイページ）</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black text-navy-800">正式査定（無料）</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          いくつかの質問に答えるだけ。分かる範囲でOKです。担当が確認し確定金額をご案内します。
          {aiLow && aiHigh && <>　<span className="font-bold text-navy-700">AI概算：{formatYen(aiLow)}〜{formatYen(aiHigh)}</span></>}
        </p>
      </div>

      {/* ステッパー */}
      <div className="mb-5 flex items-center gap-1">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-navy-500' : 'bg-slate-200'} ${i === 0 ? 'opacity-0' : ''}`} />
                <div className={`mx-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                  state === 'done' ? 'bg-navy-500 text-white' : state === 'current' ? 'bg-navy-500 text-white ring-4 ring-navy-100' : 'bg-slate-200 text-slate-400'
                }`}>
                  {state === 'done' ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <div className={`h-1 flex-1 rounded-full ${n < step ? 'bg-navy-500' : 'bg-slate-200'} ${i === STEPS.length - 1 ? 'opacity-0' : ''}`} />
              </div>
              <span className={`mt-1 text-[10px] font-bold sm:text-xs ${n === step ? 'text-navy-700' : 'text-slate-400'}`}>{label}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* STEP 1: 車両情報 */}
        {step === 1 && (
          <section className="card space-y-4 p-5">
            <h2 className="font-bold text-slate-700">車両情報</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">メーカー *</label>
                <select className="input" value={maker} onChange={(e) => { setMaker(e.target.value); setModel(''); }}>
                  <option value="">選択してください</option>
                  {CATALOG_MAKERS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">車名（車種）</label>
                <select className="input" value={model} disabled={!maker} onChange={(e) => setModel(e.target.value)}>
                  <option value="">{maker ? '選択してください' : '先にメーカーを選択'}</option>
                  {model && model !== '__other__' && !modelOptions.includes(model) && <option value={model}>{model}</option>}
                  {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                  <option value="__other__">その他（自由入力）</option>
                </select>
                {model === '__other__' && (
                  <input className="input mt-2" value={otherModel} onChange={(e) => setOtherModel(e.target.value)} placeholder="車名を入力" />
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">年式</label>
                <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}年（{wareki(y)}）</option>)}
                </select>
              </div>
              <div>
                <label className="label">走行距離</label>
                <select className="input" value={mileageKm || ''} onChange={(e) => setMileageKm(Number(e.target.value))}>
                  <option value="">選択してください</option>
                  {MILEAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">地域</label>
                <select className="input" value={prefecture} onChange={(e) => setPrefecture(e.target.value)}>
                  <option value="">選択してください</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: 車の詳細 */}
        {step === 2 && (
          <section className="card space-y-4 p-5">
            <h2 className="font-bold text-slate-700">車の詳細（分かる範囲でOK）</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">グレード</label>
                <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="例：G / RS など" />
              </div>
              <div>
                <label className="label">型式</label>
                <input className="input" value={typeCode} onChange={(e) => setTypeCode(e.target.value)} placeholder="例：DBA-XXX" />
              </div>
              <div>
                <label className="label">車台番号(VIN)</label>
                <input className="input font-mono uppercase tracking-wide" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="任意" maxLength={20} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">ミッション</label>
                <select className="input" value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                  <option value="">指定なし</option>
                  {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">燃料</label>
                <select className="input" value={fuel} onChange={(e) => setFuel(e.target.value)}>
                  <option value="">指定なし</option>
                  {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="label">ボディタイプ</label>
                <select className="input" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                  <option value="">指定なし</option>
                  {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">カラー</label>
                <select className="input" value={colorChoice} onChange={(e) => setColorChoice(e.target.value)}>
                  <option value="">選択してください</option>
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {colorChoice === 'その他' && (
                  <input className="input mt-2" value={colorOther} onChange={(e) => setColorOther(e.target.value)} placeholder="色を入力（例：ツートン）" />
                )}
              </div>
              <div>
                <label className="label">車検満了</label>
                <input className="input" type="month" value={shakenUntil} onChange={(e) => setShakenUntil(e.target.value)} />
                <p className="mt-0.5 text-xs text-slate-400">車検切れ・不明の場合は空欄でOK</p>
              </div>
            </div>
            <div>
              <label className="label">修復歴（フレーム修正・交換）</label>
              <div className="flex gap-2">
                {([['none', 'なし'], ['yes', 'あり']] as const).map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setRepair(v)}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                      repair === v ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500'
                    }`}>{l}</button>
                ))}
              </div>
              {repair === 'yes' && (
                <textarea rows={2} className="input mt-2" value={repairDetail} onChange={(e) => setRepairDetail(e.target.value)}
                  placeholder="修復・板金の箇所や程度をご記入ください" />
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {([['ワンオーナー', oneOwner, setOneOwner], ['整備記録簿あり', hasRecords, setHasRecords], ['禁煙車', nonSmoking, setNonSmoking]] as const).map(
                ([label, val, setter]) => (
                  <label key={label} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={val} onChange={(e) => setter(e.target.checked)} />
                    {label}
                  </label>
                ),
              )}
            </div>
            <div>
              <label className="label">装備・オプション</label>
              <textarea rows={3} className="input" value={equipment} onChange={(e) => setEquipment(e.target.value)}
                placeholder="ナビ / ETC / サンルーフ / 純正アルミ / 社外パーツ など" />
            </div>
            <div>
              <label className="label">気になる点・ご要望</label>
              <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="キズ・不具合・ご連絡希望の時間帯など" />
            </div>
          </section>
        )}

        {/* STEP 3: 状態の問診 */}
        {step === 3 && (
          <section className="card space-y-4 p-5">
            <div>
              <h2 className="font-bold text-slate-700">かんたん問診</h2>
              <p className="mt-0.5 text-xs text-slate-500">当てはまるものをタップするだけ。正確な査定に役立ちます。</p>
            </div>
            <div className="space-y-3">
              {DIAGNOSIS_QUESTIONS.map((qq) => (
                <div key={qq.key}>
                  <p className="text-sm font-bold text-slate-700">{qq.q}</p>
                  {qq.help && <p className="text-[11px] text-slate-400">{qq.help}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {qq.options.map((o) => {
                      const active = diagnosis[qq.key] === o.value;
                      return (
                        <button type="button" key={o.value}
                          onClick={() => setDiagnosis((prev) => ({ ...prev, [qq.key]: o.value }))}
                          className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                            active ? (o.warn ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-navy-500 bg-navy-50 text-navy-700')
                                   : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}>{o.label}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STEP 4: 写真 */}
        {step === 4 && (
          <section className="card p-5">
            <h2 className="font-bold text-slate-700">車両写真</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              ガイドに沿って撮影・アップロードいただくと、より正確に査定できます。すべて任意です。
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {APPRAISAL_PHOTO_GUIDE.map((g) => {
                const p = photos.find((x) => x.caption === g.label);
                return (
                  <div key={g.label} className="space-y-1">
                    <label className={`group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition ${
                      p ? 'border-navy-300' : 'border-dashed border-slate-300 hover:border-navy-300 hover:bg-slate-50'
                    }`}>
                      {p?.uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-navy-400" />
                      ) : p?.url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={g.label} className="h-full w-full object-cover" />
                          <span className="absolute right-1 top-1 rounded-full bg-navy-500 p-0.5 text-white"><Check className="h-3 w-3" /></span>
                        </>
                      ) : (
                        <>
                          <span className="mb-1 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-navy-50 group-hover:text-navy-500">
                            <ImagePlus className="h-4 w-4" />
                          </span>
                          <span className="px-1 text-center text-[11px] font-bold text-slate-600">{g.label}{g.private && <span className="ml-0.5 text-[9px] text-slate-400">(非公開)</span>}</span>
                          <span className="px-1 text-center text-[10px] leading-tight text-slate-400">{g.hint}</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onSlot(e, g.label)} />
                    </label>
                    {p?.url && (
                      <div className="flex items-center justify-between px-0.5">
                        <span className="truncate text-[11px] font-bold text-navy-700">{g.label}</span>
                        <button type="button" onClick={() => removePhoto(p.key)} className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-bold text-slate-600">その他の写真（自由）</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {orderedPhotos.filter((p) => appraisalGuideIndex(p.caption) >= 100 && p.url).map((p) => (
                  <div key={p.key} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePhoto(p.key)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 25 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
                    <ImagePlus className="h-6 w-6" />
                    <span className="mt-1 text-xs">追加</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onExtra} />
                  </label>
                )}
              </div>
            </div>
          </section>
        )}

        {/* STEP 5: 売却時期・ご連絡先 */}
        {step === 5 && (
          <>
            <section className="card space-y-2 p-5">
              <h2 className="font-bold text-slate-700">売却をお考えの時期</h2>
              <div className="flex flex-wrap gap-2">
                {SELL_TIMING_OPTIONS.map((o) => {
                  const active = sellTiming === o.value;
                  return (
                    <button type="button" key={o.value} onClick={() => setSellTiming(o.value)}
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                        active ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>{o.label}</button>
                  );
                })}
              </div>
            </section>

            <section className="card space-y-4 p-5">
              <h2 className="font-bold text-slate-700">ご連絡先</h2>
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
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="任意（査定結果の送付に使用）" />
                </div>
                <div>
                  <label className="label">ご連絡方法</label>
                  <select className="input" value={preferredContact} onChange={(e) => setPreferredContact(e.target.value)}>
                    <option>どちらでも</option>
                    <option>電話</option>
                    <option>メール</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">査定は無料・キャンセル可。入力内容はダイレクト販売への切り替え時にもそのまま使えます。</p>
            </section>
          </>
        )}

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {/* ナビゲーション */}
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={goBack} className="btn-outline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> 戻る
            </button>
          ) : (
            <Link href="/listings/valuation" className="btn-outline">やめる</Link>
          )}

          {step < STEPS.length ? (
            <button type="button" onClick={goNext} className="btn-primary inline-flex items-center gap-1 px-8">
              次へ <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" disabled={submitting || uploading} className="btn-primary px-8 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? '送信中…' : '正式査定を依頼する'}
            </button>
          )}
        </div>
        <p className="text-center text-xs text-slate-400">ステップ {step} / {STEPS.length}</p>
      </form>
    </div>
  );
}
