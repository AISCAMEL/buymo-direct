'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { ListingImage } from '@/lib/types';

export function ListingGallery({ images, title }: { images: ListingImage[]; title: string }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const total = sorted.length;

  function prev() { setCurrent((c) => (c - 1 + total) % total); }
  function next() { setCurrent((c) => (c + 1) % total); }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  }

  if (total === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100 text-slate-300">
        No Image
      </div>
    );
  }

  return (
    <>
      {/* メイン画像 */}
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={sorted[current].url}
          alt={`${title} ${current + 1}枚目`}
          fill
          className="object-cover transition-opacity duration-200"
          sizes="(max-width: 1024px) 100vw, 672px"
          priority={current === 0}
        />

        {/* 拡大ボタン */}
        <button
          onClick={() => setLightbox(true)}
          className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
          aria-label="拡大表示"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* 枚数インジケーター */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="前の画像"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="次の画像"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sorted.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                  aria-label={`${i + 1}枚目`}
                />
              ))}
            </div>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {current + 1} / {total}
            </span>
          </>
        )}
      </div>

      {/* サムネイル一覧 */}
      {total > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-8">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                i === current ? 'border-accent-500' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      {/* ライトボックス */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sorted[current].url}
            alt={title}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {total > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <button
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 text-white/70 hover:text-white text-2xl leading-none"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
