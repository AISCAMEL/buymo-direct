'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Archive, Presentation, ShieldCheck } from 'lucide-react';
import { INSPECTION_SPEC, OVERALL_GRADES, ratingMeta } from '@/lib/inspection-spec';
import type { InspectionSheet as Sheet } from '@/lib/inspection';

type Mode = 'archive' | 'proposal';

const MARK_TONE: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-500',
};

function gradeLabel(code?: string | null) {
  return OVERALL_GRADES.find((g) => g.code === code)?.label ?? '—';
}

function vehicleLine(s: Sheet) {
  return [s.maker, s.model, s.model_year ? `${s.model_year}年` : '', s.mileage_km != null ? `${s.mileage_km.toLocaleString()}km` : '']
    .filter(Boolean).join(' / ') || '車両情報 未入力';
}

export function InspectionSheetView({ sheet, basePath }: { sheet: Sheet; basePath: string }) {
  const [mode, setMode] = useState<Mode>('proposal');
  const v = (sheet.vehicle ?? {}) as Record<string, string>;

  // 代表写真を収集（各項目＋代表写真）
  const photos: string[] = [
    ...(sheet.photos ?? []).map((p) => p.url),
    ...Object.values(sheet.inspection ?? {}).flatMap((x) => x?.photos ?? []),
  ].filter(Boolean).slice(0, 12);

  return (
    <div className="space-y-4">
      {/* ツールバー（印刷しない） */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={basePath} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 一覧
        </Link>
        <div className="ml-2 inline-flex rounded-lg border border-slate-200 p-0.5">
          <button onClick={() => setMode('proposal')} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold ${mode === 'proposal' ? 'bg-accent-600 text-white' : 'text-slate-600'}`}>
            <Presentation className="h-4 w-4" /> 提案用
          </button>
          <button onClick={() => setMode('archive')} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold ${mode === 'archive' ? 'bg-navy-700 text-white' : 'text-slate-600'}`}>
            <Archive className="h-4 w-4" /> 保管用
          </button>
        </div>
        <Link href={`${basePath}/${sheet.id}`} className="text-sm font-bold text-slate-500 hover:text-slate-700">検査に戻る</Link>
        <button onClick={() => window.print()} className="btn-accent ml-auto inline-flex items-center gap-1.5">
          <Printer className="h-4 w-4" /> 印刷 / PDF保存
        </button>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 print:hidden">
        {mode === 'proposal'
          ? 'お客様にお見せする「提案用」です。内部メモ・整備概算は表示されません。金額は査定額のみ表示します。'
          : '社内保管用です。全項目・内部メモ・整備概算を含みます。'}
      </p>

      {/* 本体 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none" id="sheet">
        {mode === 'proposal' ? <Proposal sheet={sheet} v={v} photos={photos} /> : <ArchiveView sheet={sheet} v={v} photos={photos} />}
      </div>

      <style jsx global>{`
        @media print {
          body { background: #fff; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}

/* ───────── 提案用（お客様提示） ───────── */
function Proposal({ sheet, v, photos }: { sheet: Sheet; v: Record<string, string>; photos: string[] }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-accent-600 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-accent-600">BUYMO ダイレクト 車両査定</p>
          <h1 className="mt-1 text-2xl font-black text-navy-800">お車の査定結果</h1>
          <p className="mt-1 text-sm text-slate-500">{vehicleLine(sheet)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">総合評価</p>
          <p className="text-3xl font-black text-navy-800">{sheet.overall_rating ?? '—'}</p>
          <p className="text-xs font-bold text-slate-500">{gradeLabel(sheet.overall_rating)}</p>
        </div>
      </header>

      {/* 車両概要 */}
      <section className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Info label="メーカー / 車種" value={[sheet.maker, sheet.model].filter(Boolean).join(' ') || '—'} />
        <Info label="年式" value={sheet.model_year ? `${sheet.model_year}年` : '—'} />
        <Info label="走行距離" value={sheet.mileage_km != null ? `${sheet.mileage_km.toLocaleString()} km` : '—'} />
        <Info label="グレード" value={v.grade || '—'} />
        <Info label="カラー" value={v.color || '—'} />
        <Info label="車検満了" value={v.shaken_until || '—'} />
      </section>

      {/* コンディション（セクション別サマリー） */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-base font-black text-navy-800"><ShieldCheck className="h-5 w-5 text-accent-600" />コンディション</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {INSPECTION_SPEC.map((sec) => {
            const rows = sec.items.map((it) => ({ it, r: sheet.inspection?.[it.key] })).filter((x) => x.r?.rating && x.r.rating !== 'na');
            if (rows.length === 0) return null;
            const notable = rows.filter((x) => x.r!.rating === 'warn' || x.r!.rating === 'bad');
            const goodCount = rows.filter((x) => x.r!.rating === 'good' || x.r!.rating === 'ok').length;
            return (
              <div key={sec.key} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-800">{sec.label}</span>
                  <span className="text-xs font-bold text-emerald-600">良好 {goodCount}/{rows.length}</span>
                </div>
                {notable.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {notable.map((x) => {
                      const m = ratingMeta(x.r!.rating);
                      return (
                        <li key={x.it.key} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-black ${MARK_TONE[m?.tone ?? 'slate']}`}>{m?.mark}</span>
                          <span>{x.it.label}{x.r!.note ? `：${x.r!.note}` : ''}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-emerald-600">良好です</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 写真 */}
      {photos.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-black text-navy-800">車両写真</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover" />
            ))}
          </div>
        </section>
      )}

      {/* ご提示金額（査定額のみ） */}
      <section className="rounded-2xl bg-navy-700 p-5 text-center text-white">
        <p className="text-sm text-navy-200">ご提示金額（査定額）</p>
        <p className="mt-1 text-4xl font-black">
          {sheet.appraised_price != null ? `¥${sheet.appraised_price.toLocaleString()}` : '別途ご提示'}
        </p>
        <p className="mt-2 text-xs text-navy-200">※ 本査定は検査時点の車両状態に基づきます。相場・装備により変動する場合があります。</p>
      </section>

      <footer className="text-center text-xs text-slate-400">
        BUYMO ダイレクト（合同会社アイズ）／ 査定日：{new Date(sheet.updated_at).toLocaleDateString('ja-JP')}
      </footer>
    </div>
  );
}

/* ───────── 保管用（社内記録） ───────── */
function ArchiveView({ sheet, v, photos }: { sheet: Sheet; v: Record<string, string>; photos: string[] }) {
  return (
    <div className="space-y-5 text-sm">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-300 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-navy-600">BUYMO 査定表（保管用）</p>
          <h1 className="mt-0.5 text-xl font-black text-navy-800">{vehicleLine(sheet)}</h1>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>作成：{new Date(sheet.created_at).toLocaleString('ja-JP')}</p>
          <p>更新：{new Date(sheet.updated_at).toLocaleString('ja-JP')}</p>
          <p>区分：{sheet.scope === 'hq' ? '本部' : '加盟店'} / 状態：{sheet.status === 'done' ? '完了' : '下書き'}</p>
        </div>
      </header>

      {/* 車両情報 */}
      <section className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        <Info label="メーカー" value={sheet.maker || '—'} />
        <Info label="車種" value={sheet.model || '—'} />
        <Info label="年式" value={sheet.model_year ? `${sheet.model_year}年` : '—'} />
        <Info label="走行" value={sheet.mileage_km != null ? `${sheet.mileage_km.toLocaleString()}km` : '—'} />
        <Info label="グレード" value={v.grade || '—'} />
        <Info label="型式" value={v.type_code || '—'} />
        <Info label="車台番号" value={v.vin || '—'} />
        <Info label="カラー" value={v.color || '—'} />
        <Info label="車検満了" value={v.shaken_until || '—'} />
        <Info label="ナンバー" value={sheet.plate || '—'} />
        <Info label="所有者/提示先" value={sheet.customer_name || '—'} />
      </section>

      {/* 全項目 */}
      <section className="space-y-3">
        {INSPECTION_SPEC.map((sec) => {
          const rows = sec.items.map((it) => ({ it, r: sheet.inspection?.[it.key] })).filter((x) => x.r?.rating || x.r?.note || x.r?.photos?.length);
          if (rows.length === 0) return null;
          return (
            <div key={sec.key} className="break-inside-avoid rounded-xl border border-slate-200 p-3">
              <h3 className="mb-2 font-black text-navy-800">{sec.label}</h3>
              <div className="space-y-1.5">
                {rows.map((x) => {
                  const m = ratingMeta(x.r!.rating);
                  return (
                    <div key={x.it.key} className="flex items-start gap-2">
                      <span className={`inline-flex h-5 w-8 shrink-0 items-center justify-center rounded text-xs font-black ${MARK_TONE[m?.tone ?? 'slate']}`}>{m?.mark ?? '—'}</span>
                      <span className="w-28 shrink-0 font-bold text-slate-600">{x.it.label}</span>
                      <span className="flex-1 text-slate-600">
                        {x.r!.note || ''}
                        {!!x.r!.photos?.length && (
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {x.r!.photos.map((u) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={u} src={u} alt="" className="h-14 w-14 rounded border border-slate-200 object-cover" />
                            ))}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* 評価・金額・内部メモ */}
      <section className="grid gap-3 border-t border-slate-300 pt-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">総合評価</p>
          <p className="text-2xl font-black text-navy-800">{sheet.overall_rating ?? '—'} <span className="text-sm font-bold text-slate-500">{gradeLabel(sheet.overall_rating)}</span></p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">査定額</p>
          <p className="text-2xl font-black text-navy-800">{sheet.appraised_price != null ? `¥${sheet.appraised_price.toLocaleString()}` : '—'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">整備概算（内部）</p>
          <p className="text-2xl font-black text-navy-800">{sheet.cost_estimate != null ? `¥${sheet.cost_estimate.toLocaleString()}` : '—'}</p>
        </div>
      </section>
      {sheet.internal_note && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-700">内部メモ</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{sheet.internal_note}</p>
        </section>
      )}
      {photos.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-bold text-slate-500">添付写真（{photos.length}）</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="aspect-square w-full rounded border border-slate-200 object-cover" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-bold text-slate-700">{value}</p>
    </div>
  );
}
