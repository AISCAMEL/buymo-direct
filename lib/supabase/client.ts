'use client';

import { createBrowserClient } from '@supabase/ssr';

// Note: we intentionally don't pass a Database generic. Hand-written types
// break Supabase's embedded-relationship inference (resolves to `never`);
// we cast query results to the interfaces in `lib/types.ts` at call sites.

/** Browser-side Supabase client (Client Components). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
