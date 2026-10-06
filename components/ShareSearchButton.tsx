'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export function ShareSearchButton() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BUYMO ダイレクト 車検索', url });
        return;
      }
    } catch {
      /* ユーザーがキャンセル等 → コピーにフォールバック */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard 不可 */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="btn-outline flex items-center gap-1 text-sm"
      aria-label="この検索条件を共有"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? 'コピーしました' : '共有'}</span>
    </button>
  );
}
