'use client';

import { Printer } from 'lucide-react';
import { SELL_TIMING, MOTIVES } from '@/lib/hearing';

const Line = ({ w = '100%', label }: { w?: string; label?: string }) => (
  <span className="inline-flex items-baseline gap-1">
    {label && <span className="text-[11px] text-slate-500">{label}</span>}
    <span style={{ width: w }} className="inline-block border-b border-slate-400" >&nbsp;</span>
  </span>
);
const Box = ({ label }: { label: string }) => (
  <span className="mr-3 inline-flex items-center gap-1 text-sm"><span className="inline-block h-4 w-4 border border-slate-500" />{label}</span>
);

export default function HearingPrintPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-slate-500">紙に記入する用（出張・来店査定）。印刷してご利用ください。</p>
        <button onClick={() => window.print()} className="btn-accent inline-flex items-center gap-1.5"><Printer className="h-4 w-4" />印刷 / PDF保存</button>
      </div>

      <div id="sheet" className="rounded-xl border border-slate-300 p-6 text-sm leading-7 print:border-0 print:p-0">
        <header className="mb-4 flex items-end justify-between border-b-2 border-navy-700 pb-2">
          <div>
            <p className="text-xs font-black tracking-widest text-navy-600">BUYMO 査定ヒアリングシート</p>
            <h1 className="text-xl font-black text-navy-800">お客様 聞き取り用紙</h1>
          </div>
          <div className="text-xs text-slate-500">日付：<Line w="90px" />　担当：<Line w="90px" />　店舗：<Line w="90px" /></div>
        </header>

        <section className="mb-3">
          <p className="font-black text-navy-800">■ お客様・お車</p>
          <p>お名前：<Line w="200px" />　ご連絡先：<Line w="200px" /></p>
          <p>メーカー：<Line w="120px" />　車種：<Line w="150px" />　年式：<Line w="70px" />　走行：<Line w="90px" />km　ナンバー：<Line w="120px" /></p>
        </section>

        <section className="mb-3">
          <p className="font-black text-navy-800">■ 他社の査定額（比較）</p>
          <p>①他社名：<Line w="160px" />　金額：<Line w="120px" />円</p>
          <p>②他社名：<Line w="160px" />　金額：<Line w="120px" />円</p>
          <p>③他社名：<Line w="160px" />　金額：<Line w="120px" />円</p>
        </section>

        <section className="mb-3">
          <p className="font-black text-navy-800">■ ご希望・ご状況</p>
          <p>ご希望金額：<Line w="140px" />円</p>
          <p className="mt-1">売却時期：{SELL_TIMING.map((t) => <Box key={t} label={t} />)}</p>
          <p className="mt-1">売却の理由：{MOTIVES.map((m) => <Box key={m} label={m} />)}</p>
          <p className="mt-1">現在の状況（他社と商談中・比較中など）：<Line w="320px" /></p>
        </section>

        <section className="mb-3">
          <p className="font-black text-navy-800">■ 車両の状態・ご要望</p>
          <p>気になる傷・不具合・修復歴：</p>
          <p><Line w="100%" /></p>
          <p><Line w="100%" /></p>
          <p className="mt-1">その他ご要望・ご質問：</p>
          <p><Line w="100%" /></p>
        </section>

        <p className="mt-4 text-xs text-slate-500">※ ご記入内容は査定・ご提案のために使用します。／ Web入力は店舗QRまたは buymo のヒアリングフォームから。</p>
      </div>

      <style jsx global>{`@media print { body { background:#fff; } @page { margin: 12mm; } }`}</style>
    </div>
  );
}
