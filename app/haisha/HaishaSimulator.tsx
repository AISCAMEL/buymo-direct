'use client';

import { useMemo, useState } from 'react';
import { Calculator, Loader2, CheckCircle2, AlertTriangle, Info, FileText, ArrowRight } from 'lucide-react';
import { formatYen } from '@/lib/format';
import {
  PREF_ORDER, PREF_NOTE, OUT_OF_TABLE, SIDE_PREFS, DISP_CLASSES, WEIGHT_CLASSES, MILEAGE_OPTIONS,
  OWNER_LABELS, calcHaishaPrice, calcHaishaRefund, requiredHaishaDocs, type HaishaInput,
} from '@/lib/haisha';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);
const MISSING_ITEMS: { value: string; label: string }[] = [
  { value: 'battery', label: 'バッテリー欠品' },
  { value: 'muffler', label: 'マフラー・触媒欠品' },
  { value: 'tire', label: 'タイヤ・ホイールなし' },
  { value: 'ext', label: '外装パーツ欠品' },
  { value: 'engine', label: 'エンジン・ミッションなし' },
  { value: 'doc', label: '車検証なし（再発行）' },
  { value: 'recycle', label: 'リサイクル料金 未預託' },
];

export function HaishaSimulator() {
  const [maker, setMaker] = useState('トヨタ');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR - 13);
  const [body, setBody] = useState('乗用');
  const [color, setColor] = useState('');
  const [pref, setPref] = useState('東京都');
  const [side, setSide] = useState('太平洋側');
  const [dispIdx, setDispIdx] = useState(3);
  const [weightIdx, setWeightIdx] = useState(3);
  const [mileage, setMileage] = useState('〜10万km');
  const [run, setRun] = useState('nostart');
  const [keyState, setKeyState] = useState('ok');
  const [shaken, setShaken] = useState(0);
  const [rep, setRep] = useState('no');
  const [missing, setMissing] = useState<string[]>([]);
  const [owner, setOwner] = useState('self');
  const [matsu, setMatsu] = useState('eikyu');

  const [shown, setShown] = useState(false);
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

  const sideNeeded = SIDE_PREFS.includes(pref);
  const input: HaishaInput = {
    pref, side, dispIdx, weightIdx, mileage, run, key: keyState, shakenMonths: shaken, rep, missing, owner, matsu,
  };
  const price = useMemo(() => calcHaishaPrice(input), [pref, side, dispIdx, run, keyState, missing]);
  const refund = useMemo(() => calcHaishaRefund(input), [dispIdx, weightIdx, shaken, matsu]);
  const docs = requiredHaishaDocs(owner);

  function toggleMissing(v: string) {
    setMissing((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('お名前を入力してください。'); return; }
    if (!phone.trim()) { setError('電話番号を入力してください。'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/haisha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maker, model, year, body, color,
          pref, side: sideNeeded ? side : undefined, dispIdx, weightIdx, mileage,
          run, key: keyState, shakenMonths: shaken, rep, missing, owner, matsu,
          name, phone, email: email.trim() || undefined, preferredDate: date, notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送信に失敗しました');
      setDone(true);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
        <h3 className="text-lg font-black text-navy-800">廃車買取のお申し込みを受け付けました</h3>
        <p className="mt-1 text-sm text-slate-500">
          担当より無料引取り・正式金額・必要書類をご案内します（通常1〜2営業日）。
          ご連絡先：{phone}{email ? ` / ${email}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-navy-500" />
        <h2 className="text-lg font-black text-navy-800">その場提示 買取シミュレーション</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        全国買取価格表（都道府県 × 排気量）をもとに「その場提示額」を表示します。還付金は買取価格とは別枠で概算します。
      </p>

      {/* 1. 車両 */}
      <Section n={1} title="車両情報">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="メーカー">
            <select className="input" value={maker} onChange={(e) => setMaker(e.target.value)}>
              {['トヨタ', '日産', 'ホンダ', 'スズキ', 'ダイハツ', 'マツダ', 'スバル', '三菱', '輸入車', 'その他'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="車名"><input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="例：アクア" /></Field>
          <Field label="初度登録(年)">
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
          </Field>
          <Field label="ボディ">
            <select className="input" value={body} onChange={(e) => setBody(e.target.value)}>
              {['軽', '乗用', 'SUV・RV', 'ミニバン・1BOX', 'トラック・商用'].map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="色"><input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="例：ホワイト" /></Field>
        </div>
      </Section>

      {/* 2. エリア・排気量 */}
      <Section n={2} title="エリア・排気量">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="都道府県">
            <select className="input" value={pref} onChange={(e) => { setPref(e.target.value); setShown(false); }}>
              {PREF_ORDER.map((p) => (
                <option key={p} value={p}>
                  {p}{PREF_NOTE[p] ? `（${PREF_NOTE[p]}）` : ''}{OUT_OF_TABLE.includes(p) ? '（対象外）' : ''}
                </option>
              ))}
            </select>
          </Field>
          {sideNeeded && (
            <Field label="地域">
              <select className="input" value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="太平洋側">太平洋側</option>
                <option value="日本海側">日本海側</option>
              </select>
            </Field>
          )}
          <Field label="排気量区分">
            <select className="input" value={dispIdx} onChange={(e) => setDispIdx(Number(e.target.value))}>
              {DISP_CLASSES.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="車両重量（車検証）">
            <select className="input" value={weightIdx} onChange={(e) => setWeightIdx(Number(e.target.value))}>
              {WEIGHT_CLASSES.map((w, i) => <option key={w} value={i}>{w}</option>)}
            </select>
          </Field>
          <Field label="走行距離">
            <select className="input" value={mileage} onChange={(e) => setMileage(e.target.value)}>
              {MILEAGE_OPTIONS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* 3. 状態 */}
      <Section n={3} title="車両の状態（詳しく）">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="自走・損傷">
            <select className="input" value={run} onChange={(e) => setRun(e.target.value)}>
              <option value="run">自走できる</option>
              <option value="idle">始動するが不動</option>
              <option value="nostart">エンジン始動不可</option>
              <option value="accident">事故・損傷大</option>
              <option value="flood">水没・冠水</option>
              <option value="burn">火災・全焼</option>
            </select>
          </Field>
          <Field label="鍵">
            <select className="input" value={keyState} onChange={(e) => setKeyState(e.target.value)}>
              <option value="ok">あり</option>
              <option value="nokey">なし</option>
            </select>
          </Field>
          <Field label="車検残り">
            <select className="input" value={shaken} onChange={(e) => setShaken(Number(e.target.value))}>
              <option value={0}>車検切れ</option>
              {[3, 6, 9, 12, 15, 18, 21, 24].map((m) => <option key={m} value={m}>約{m}ヶ月</option>)}
            </select>
          </Field>
          <Field label="修復歴">
            <select className="input" value={rep} onChange={(e) => setRep(e.target.value)}>
              <option value="no">なし</option>
              <option value="yes">あり</option>
            </select>
          </Field>
        </div>
        <p className="mt-3 mb-2 text-xs text-slate-500">欠品・不足（複数選択可）— 減額または引取不可の対象になります</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MISSING_ITEMS.map((m) => {
            const on = missing.includes(m.value);
            return (
              <label key={m.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm ${on ? 'border-navy-500 bg-navy-50' : 'border-slate-200'}`}>
                <input type="checkbox" checked={on} onChange={() => toggleMissing(m.value)} className="h-4 w-4 accent-navy-600" />
                {m.label}
              </label>
            );
          })}
        </div>
      </Section>

      {/* 4. 名義・抹消 */}
      <Section n={4} title="名義・抹消">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="車検証の名義">
            <select className="input" value={owner} onChange={(e) => setOwner(e.target.value)}>
              {Object.entries(OWNER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="抹消区分">
            <select className="input" value={matsu} onChange={(e) => setMatsu(e.target.value)}>
              <option value="eikyu">永久抹消（解体）</option>
              <option value="ichiji">一時抹消</option>
            </select>
          </Field>
        </div>
      </Section>

      <button type="button" onClick={() => { setShown(true); setShowForm(false); }} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3">
        <Calculator className="h-4 w-4" /> その場で金額を提示する
      </button>

      {shown && (
        <div className="mt-5 space-y-4">
          {price.outOfTable ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mb-1 inline h-4 w-4" /> <b>{pref}は全国買取価格表の対象外</b>です。個別にお見積りします（対応不可の場合あり）。
            </div>
          ) : (
            <>
              {/* 買取額（基準額・割引は非表示。顧客にはその場提示額のみ。欠品・状態の減額は明示） */}
              {(() => {
                // 基準額（定価）と「その場提示割引」はお客様に出さない。状態・欠品の減額のみ表示。
                const dedLines = price.lines.filter((l) => !l.base && l.label !== 'その場提示割引');
                return (
                  <div className="overflow-hidden rounded-2xl border-2 border-navy-500">
                    <div className="bg-navy-50 px-4 py-3 text-sm font-bold text-navy-700">
                      🧾 その場提示 買取額{dedLines.length > 0 ? '（内訳）' : ''} — {pref}{sideNeeded ? ` ${side}` : ''} / {DISP_CLASSES[dispIdx]}
                    </div>
                    <div className="px-4 py-3">
                      {dedLines.map((l, i) => (
                        <div key={i} className="flex justify-between border-t border-slate-100 py-1.5 text-sm first:border-t-0 tabular-nums">
                          <span>{l.label}</span>
                          <span className={l.amount < 0 ? 'text-red-600' : 'text-emerald-600'}>
                            {l.amount < 0 ? '−' : ''}{formatYen(Math.abs(l.amount))}
                          </span>
                        </div>
                      ))}
                      <div className={`flex items-center justify-between border-navy-500 ${dedLines.length > 0 ? 'mt-1 border-t-2 pt-2.5' : ''}`}>
                        <span className="font-black">{price.blocked ? '概算（要別途査定）' : 'その場提示 買取額'}</span>
                        <span className="text-2xl font-black text-accent-600 tabular-nums">
                          {price.offer <= 0 ? '¥0（無料引取り）' : formatYen(price.offer)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 還付金（別枠） */}
              <div className="overflow-hidden rounded-2xl border-2 border-gold-400">
                <div className="flex justify-between bg-gold-100 px-4 py-3 text-sm font-bold text-gold-600">
                  <span>💴 還付金（買取価格とは別にお戻し）</span>
                  <span>{formatYen(refund.total)}</span>
                </div>
                <div className="px-4 py-3 text-sm tabular-nums">
                  <RefundRow label="自動車税（種別割）" note={dispIdx === 0 ? '軽は還付なし' : `残${refund.taxRemain}ヶ月`} val={refund.jidosha} />
                  <RefundRow label="自動車重量税" note={refund.eikyu ? `車検残${refund.shakenMonths}ヶ月` : '一時抹消は対象外'} val={refund.juryo} />
                  <RefundRow label="自賠責保険" note={`残${refund.shakenMonths}ヶ月`} val={refund.jibai} />
                  <div className="mt-1 flex justify-between border-t-2 border-gold-400 pt-2.5 font-black">
                    <span>還付金 合計（概算）</span>
                    <span className="text-gold-600">{formatYen(refund.total)}</span>
                  </div>
                  <p className="mt-2 rounded-lg bg-navy-50 p-2 text-xs text-navy-700">
                    <Info className="mr-1 inline h-3.5 w-3.5" />
                    買取額 <b>{price.offer <= 0 ? '¥0' : formatYen(price.offer)}</b> ＋ 還付金 <b>{formatYen(refund.total)}</b> ＝ <b>お受取り目安 {formatYen(Math.max(0, price.offer) + refund.total)}</b>
                  </p>
                </div>
              </div>

              {/* フラグ */}
              {(price.warnings.length > 0 || owner === 'lien' || owner === 'deceased' || PREF_NOTE[pref]) && (
                <div className="space-y-2">
                  {owner === 'lien' && <Flag kind="warn">所有権留保 → 別途手続き。所有権解除書類（完済証明・譲渡証明・信販/ディーラーの印鑑証明）が必要です。</Flag>}
                  {owner === 'deceased' && <Flag kind="warn">相続（名義人死亡）→ 別途請求。戸籍一式・相続人の委任等が必要で、相続手続き代行費を別途申し受けます。</Flag>}
                  {price.warnings.map((w, i) => <Flag key={i} kind="stop">{w}</Flag>)}
                  {PREF_NOTE[pref] && <Flag kind="warn">{pref}は「{PREF_NOTE[pref]}」。エリアにより対応不可・減額の場合があります。</Flag>}
                </div>
              )}

              {/* 必要書類 */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-700">
                  <FileText className="h-4 w-4" /> 必要書類（{OWNER_LABELS[owner]}）
                </p>
                <div className="space-y-0">
                  {docs.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 border-t border-dashed border-slate-100 py-1.5 text-sm first:border-t-0">
                      <FileText className="h-3.5 w-3.5 text-navy-400" />
                      <span>{d.label}</span>
                      <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-bold ${d.required ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                        {d.required ? '必須' : '条件付'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="rounded-lg bg-navy-50 p-2 text-xs text-navy-700">
                <Info className="mr-1 inline h-3.5 w-3.5" />
                廃車は<b>排気量・地域</b>で算定するため、走行距離は金額に影響しません（{mileage}）。
              </p>

              {!showForm && (
                <button type="button" onClick={() => setShowForm(true)} className="btn-gold flex w-full items-center justify-center gap-1.5 py-3">
                  この金額で買取を申し込む（無料引取り手配） <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 申込フォーム */}
      {shown && showForm && (
        <form onSubmit={submit} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <h3 className="font-bold text-slate-700">廃車買取のお申し込み</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="お名前 *"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" /></Field>
            <Field label="電話番号 *"><input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09012345678" /></Field>
            <Field label="メールアドレス"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="任意" /></Field>
            <Field label="希望引取日"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label="備考（引取場所の詳細・ご要望など）">
            <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例：自宅駐車場、平日午前希望 など" />
          </Field>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '送信中…' : 'この内容で申し込む'}
          </button>
        </form>
      )}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy-700">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-700 text-[11px] text-white">{n}</span>
        {title}
      </p>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function RefundRow({ label, note, val }: { label: string; note: string; val: number }) {
  return (
    <div className="flex justify-between border-t border-slate-100 py-1.5 first:border-t-0">
      <span>{label} <span className="text-xs text-slate-400">{note}</span></span>
      <span>{val > 0 ? formatYen(val) : '—'}</span>
    </div>
  );
}
function Flag({ kind, children }: { kind: 'warn' | 'stop' | 'info'; children: React.ReactNode }) {
  const cls = kind === 'stop' ? 'bg-red-50 text-red-700 border-red-200'
    : kind === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-navy-50 text-navy-700 border-navy-100';
  const Icon = kind === 'info' ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${cls}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-none" /><span>{children}</span>
    </div>
  );
}
