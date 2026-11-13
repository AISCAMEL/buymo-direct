'use client';

import { useEffect } from 'react';

/** スクロールすると <html> に .scrolled を付ける（ヘッダーの影演出用）。軽量・passive。 */
export function HeaderScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        root.classList.toggle('scrolled', window.scrollY > 8);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
