'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardCheck, ImagePlus, X, Check, Loader2, CheckCircle2 } from 'lucide-react';
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

type Photo = { key: string; url?: string; caption?: string; uploading?: boolean };

export function AppraisalDetailForm() {
  const sp = useSearchParams();
  const sidRef = useRef<string>(Math.random().toString(36).slice(2, 12));

  // AI査定から引き継ぎ
  const [maker, setMaker] = useState(sp.get('maker') ?? '');
  const [model, setModel] = useState(sp.get('model') ?? '');
  const [otherModel, setOtherModel] = useState('');
  const [year, setYear] = useState<number>(sp.get('year') ? Number(sp.get('year')) : CURRENT_YEAR - 5);
  const [mileageKm, setMileageKm] = useState<number>(sp.get('mileageKm') ? Number(sp.get('mileageKm')) : 0);
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
  const [color, setColor] = useState('');
  const [shakenUntil, setShakenUntil] = useState('');
  const [repair, setRepair] = useState<'none' | 'yes'>('none');
  const [repairDetail, setRepairDetail] = useState('');
  const [oneOwner, setOneOwner] = useState(false);
  const [hasRecords, setHasRecords] = useState(false);
  const [nonSmoking, setNonSmoking] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');

  // かんたん問診・売却時期
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
    const files = Array.from(e.target.files ?? []).slice(0, 20 - photos.length);
    files.forEach((f) => uploadFile(f));
    e.target.value = '';
  }
  function removePhoto(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  const finalModel = model === '__other__' ? otherModel.trim() : model;
  const uploading = photos.some((p) => p.uploading);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!maker) { setError('メーカーを選択してください。'); return; }
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
          grade, typeCode, vin, transmission, fuel, bodyType, color, shakenUntil,
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

  const orderedPhotos = useMemo(
    () => [...photos].sort((a, b) => appraisalGuideIndex(a.caption) - appraisalGuideIndex(b.caption)),
    [photos],
  );

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
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black text-navy-800">正式査定（詳細情報の入力）</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          正確な査定のため、車両の詳細と写真をご入力ください。担当が確認し確定金額をご案内します（無料・キャンセル可）。
          {aiLow && aiHigh && <>　<span className="font-bold text-navy-700">AI概算：{formatYen(aiLow)}〜{formatYen(aiHigh)}</span></>}
        </p>
      </div>

      {/* はじめての方へ（かんたん3ステップ） */}
      <div className="rounded-2xl border border-navy-100 bg-navy-50/60 p-4">
        <p className="text-sm font-black text-navy-800">はじめての方へ — かんたん3ステップ</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { n: '1', t: '入力', d: '分かる範囲でOK。空欄があっても大丈夫です' },
            { n: '2', t: '写真', d: 'スマホで撮ってアップ。すべて任意です' },
            { n: '3', t: '待つ', d: '担当が確認し金額をご連絡（1〜2営業日）' },
          ].map((s) => (
            <div key={s.n} className="rounded-xl bg-white p-2.5">
              <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-navy-500 text-[11px] font-black text-white">{s.n}</div>
              <p className="font-bold text-navy-800">{s.t}</p>
              <p className="mt-0.5 leading-tight text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          ※ 分からない項目は空欄のままで進めます。あとで担当がお電話・メールで確認します。
        </p>
      </div>

      {/* 車両基本 */}
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
            <label className="label">走行距離(km)</label>
            <input className="input" type="number" min={0} value={mileageKm || ''} onFocus={(e) => e.target.select()}
              onChange={(e) => setMileageKm(Number(e.target.value))} placeholder="50000" />
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

      {/* 詳細情報 */}
      <section className="card space-y-4 p-5">
        <h2 className="font-bold text-slate-700">詳細情報（査定に使用）</h2>
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
            <input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="パールホワイト" />
          </div>
          <div>
            <label className="label">車検満了</label>
            <input className="input" type="month" value={shakenUntil} onChange={(e) => setShakenUntil(e.target.value)} />
            <p className="mt-0.5 text-xs text-slate-400">車検切れ・不明の場合は空欄でOK</p>
          </div>
        </div>
        <div>
          <label className="label">修復歴</label>
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

      {/* かんたん問診 */}
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
                    <button
                      type="button"
                      key={o.value}
                      onClick={() => setDiagnosis((prev) => ({ ...prev, [qq.key]: o.value }))}
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                        active
                          ? o.warn
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-navy-500 bg-navy-50 text-navy-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 売却時期 */}
      <section className="card space-y-2 p-5">
        <h2 className="font-bold text-slate-700">売却をお考えの時期</h2>
        <div className="flex flex-wrap gap-2">
          {SELL_TIMING_OPTIONS.map((o) => {
            const active = sellTiming === o.value;
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => setSellTiming(o.value)}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                  active ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 写真 */}
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
                      <span className="px-1 text-center text-[11px] font-bold text-slate-600">{g.label}</span>
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
        {/* その他 */}
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
            {photos.length < 20 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
                <ImagePlus className="h-6 w-6" />
                <span className="mt-1 text-xs">追加</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onExtra} />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* 連絡先 */}
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
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/listings/valuation" className="btn-outline text-center">戻る</Link>
        <button type="submit" disabled={submitting || uploading} className="btn-primary px-8 disabled:opacity-60">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? '送信中…' : 'この内容で正式査定を依頼する'}
        </button>
      </div>
      <p className="text-center text-xs text-slate-400">査定は無料・キャンセル可。入力内容はダイレクト販売への切り替え時にもそのまま使えます。</p>
    </form>
  );
}
