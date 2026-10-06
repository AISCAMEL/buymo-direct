'use client';

import { useState, useRef, useEffect } from 'react';
import { Share2, Link as LinkIcon, Check, MessageCircle, Twitter, Facebook, Mail, QrCode, X as XIcon } from 'lucide-react';

/**
 * 車（出品）をシェアするボタン。
 * - モバイル等で Web Share API が使えればOSの共有シートを開く
 * - 使えない環境（主にPC）は LINE / X / Facebook / リンクコピー のメニューを表示
 */
export function ShareButton({
  url,
  title,
  className = '',
  compact = false,
}: {
  url: string;
  title: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function onShare() {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title, text: title, url });
        return;
      } catch {
        /* キャンセル時などはメニューにフォールバック */
      }
    }
    setOpen((v) => !v);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* コピー不可環境は無視 */
    }
  }

  const enc = encodeURIComponent;
  const line = `https://social-plugins.line.me/lineit/share?url=${enc(url)}`;
  const x = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const mail = `mailto:?subject=${enc(title)}&body=${enc(`${title}\n${url}`)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${enc(url)}`;

  const item = 'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={onShare}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50'
            : 'btn-outline w-full'
        }
        aria-label="この車をシェア"
      >
        <Share2 className="h-4 w-4" />
        {compact ? 'シェア' : 'この車をシェアする'}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <a href={line} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
            <MessageCircle className="h-4 w-4 text-[#06C755]" /> LINE で送る
          </a>
          <a href={x} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
            <Twitter className="h-4 w-4 text-slate-700" /> X（Twitter）
          </a>
          <a href={fb} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
            <Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook
          </a>
          <a href={mail} className={item} onClick={() => setOpen(false)}>
            <Mail className="h-4 w-4 text-slate-500" /> メールで送る
          </a>
          <button type="button" onClick={() => { setOpen(false); setQr(true); }} className={`${item} w-full`}>
            <QrCode className="h-4 w-4 text-slate-500" /> QRコードを表示
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button type="button" onClick={copyLink} className={`${item} w-full`}>
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <LinkIcon className="h-4 w-4 text-slate-400" />}
            {copied ? 'コピーしました' : 'リンクをコピー'}
          </button>
        </div>
      )}

      {qr && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQr(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setQr(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100"
              aria-label="閉じる"
            >
              <XIcon className="h-4 w-4" />
            </button>
            <p className="mb-3 flex items-center justify-center gap-1.5 text-sm font-black text-navy-700">
              <QrCode className="h-4 w-4" /> この車のQRコード
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="この車のQRコード" width={240} height={240} className="mx-auto h-auto w-full max-w-[240px] rounded-lg border border-slate-100" />
            <p className="mt-3 break-all text-[11px] text-slate-400">{url}</p>
            <button type="button" onClick={copyLink} className="btn-outline mt-3 w-full">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <LinkIcon className="h-4 w-4" />}
              {copied ? 'コピーしました' : 'リンクをコピー'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
