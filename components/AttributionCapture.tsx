'use client';

import { useEffect } from 'react';

// 加盟店募集ページの初回接触（流入元）をCookieに保存する。既にあれば上書きしない（first-touch）。
// 画面には何も表示しない。
export function AttributionCapture() {
  useEffect(() => {
    try {
      const COOKIE = 'buymo_attr';
      const has = document.cookie.split('; ').some((c) => c.startsWith(COOKIE + '='));
      if (has) return; // first-touch を維持

      const q = new URLSearchParams(window.location.search);
      const pick = (k: string) => (q.get(k) || '').slice(0, 120) || null;
      const ref = (() => {
        try {
          if (!document.referrer) return null;
          const h = new URL(document.referrer).hostname;
          if (h && h === window.location.hostname) return null; // 自サイト内遷移は除外
          return document.referrer.slice(0, 200);
        } catch { return null; }
      })();

      const data = {
        source: pick('utm_source'),
        medium: pick('utm_medium'),
        campaign: pick('utm_campaign'),
        term: pick('utm_term'),
        content: pick('utm_content'),
        referrer: ref,
        landing: (window.location.pathname + window.location.search).slice(0, 200),
        ts: Date.now(),
      };

      // utm も参照元も無い完全な直接流入は、後からの広告流入を拾えるよう記録しない
      if (!data.source && !data.referrer && !data.campaign) return;

      const maxAge = 60 * 60 * 24 * 180; // 180日
      document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(data)) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
    } catch {
      /* noop */
    }
  }, []);

  return null;
}
