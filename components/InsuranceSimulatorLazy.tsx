'use client';

import nextDynamic from 'next/dynamic';

// Client-only wrapper: `next/dynamic` with `ssr: false` must live in a Client
// Component (Next.js 15 disallows it inside Server Components).
export const InsuranceSimulator = nextDynamic(
  () => import('@/components/InsuranceSimulator').then((m) => m.InsuranceSimulator),
  { ssr: false }
);
