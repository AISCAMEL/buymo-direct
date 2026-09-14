'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import type { AnnouncementLevel } from '@/lib/types';

const LEVEL_CLS: Record<AnnouncementLevel, string> = {
  info: 'bg-navy-500 text-white',
  warning: 'bg-amber-500 text-white',
  important: 'bg-red-600 text-white',
};

/** ピン留めお知らせの上部バナー。localStorage で個別に閉じられる。 */
export function AnnouncementBanner({
  id,
  title,
  level,
}: {
  id: string;
  title: string;
  level: AnnouncementLevel;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(`ann_dismissed_${id}`) !== '1');
  }, [id]);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(`ann_dismissed_${id}`, '1');
    setShow(false);
  }

  return (
    <div className={`${LEVEL_CLS[level]}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <Megaphone className="h-4 w-4 shrink-0" />
        <Link href="/announcements" className="min-w-0 flex-1 truncate font-bold hover:underline">
          {title}
        </Link>
        <button onClick={dismiss} aria-label="閉じる" className="shrink-0 rounded p-1 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
