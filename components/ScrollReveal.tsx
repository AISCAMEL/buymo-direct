'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * スクロール連動のふわっと表示。
 * [data-reveal] 属性の要素を、ビューポートに入ったら reveal-in を付けて表示する。
 * - JS有効時のみ html.has-reveal を付けて隠す（JS無効なら内容は常に表示＝FOUC回避）
 * - prefers-reduced-motion では即表示
 * - ルート遷移ごとに新しい [data-reveal] を監視
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('has-reveal');

    const els = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.reveal-in)'),
    );
    if (els.length === 0) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('reveal-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    els.forEach((el) => io.observe(el));

    // 念のため：すでに画面内にある要素を即時表示（初回描画のちらつき防止）
    requestAnimationFrame(() => {
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          el.classList.add('reveal-in');
          io.unobserve(el);
        }
      });
    });

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
