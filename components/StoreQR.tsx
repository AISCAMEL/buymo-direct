'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Copy, Check } from 'lucide-react';

export function StoreQR({ dealerId, storeName }: { dealerId: string; storeName: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);
  const url = origin ? `${origin}/hearing?d=${encodeURIComponent(dealerId)}` : '';

  function copy() {
    try { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  }
  function downloadPng() {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = (canvas as HTMLCanvasElement).toDataURL('image/png');
    a.download = `buymo-qr-${storeName || dealerId}.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* 操作バー（印刷しない） */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button onClick={() => window.print()} className="btn-accent inline-flex items-center gap-1.5"><Printer className="h-4 w-4" />印刷 / PDF</button>
        <button onClick={downloadPng} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4" />PNG保存</button>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}リンクをコピー</button>
      </div>

      {/* 印刷ポスター */}
      <div id="qrPoster" className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm print:border-0 print:shadow-none">
        <p className="text-xs font-black uppercase tracking-widest text-accent-600">BUYMO 車買取</p>
        <h1 className="mt-1 text-2xl font-black text-navy-800">無料査定・ご相談はこちら</h1>
        <p className="mt-1 text-sm text-slate-500">{storeName}</p>

        <div className="my-6 inline-flex rounded-xl border border-slate-200 p-4">
          {url ? <QRCodeSVG value={url} size={220} level="M" includeMargin /> : <div className="h-[220px] w-[220px] animate-pulse rounded bg-slate-100" />}
        </div>

        <p className="text-base font-bold text-navy-800">スマホのカメラでQRを読み取り、<br />かんたんヒアリングにご記入ください。</p>
        <p className="mt-2 text-xs text-slate-400">他社の査定額・ご希望もお聞かせください。より正確・より高い査定のために。</p>
        {url && <p className="mt-3 break-all text-[11px] text-slate-400">{url}</p>}
      </div>

      {/* PNG出力用（非表示のCanvas） */}
      <div ref={canvasWrapRef} className="hidden" aria-hidden>
        {url && <QRCodeCanvas value={url} size={600} level="M" includeMargin />}
      </div>

      <style jsx global>{`@media print { body { background:#fff; } @page { margin: 16mm; } }`}</style>
    </div>
  );
}
