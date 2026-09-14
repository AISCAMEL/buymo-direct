'use client';

import dynamic from 'next/dynamic';
import type { PrefectureGroup } from './MapListingsInner';

const MapListingsInner = dynamic(
  () => import('./MapListingsInner').then((m) => ({ default: m.MapListingsInner })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-sm">
        地図を読み込み中…
      </div>
    ),
  }
);

export function MapListings({ groups }: { groups: PrefectureGroup[] }) {
  return <MapListingsInner groups={groups} />;
}

export type { PrefectureGroup };
