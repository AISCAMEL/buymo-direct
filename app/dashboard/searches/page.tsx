import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, Trash2, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { describeSearch, searchHref } from '@/lib/search';
import { deleteSavedSearch } from '@/app/searches/actions';
import { applyListingFilters } from '@/lib/listingQuery';
import { formatDate } from '@/lib/format';
import type { SavedSearch } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** 保存検索ごとに last_checked_at 以降の新着件数を取得 */
async function fetchNewCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  items: SavedSearch[]
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    items.map(async (s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('created_at', s.last_checked_at);
      q = applyListingFilters(q, s.params as Record<string, string>);
      const { count } = await q;
      return [s.id, count ?? 0] as const;
    })
  );
  return Object.fromEntries(entries);
}

export default async function SavedSearchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/searches');

  const { data } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const items = (data ?? []) as SavedSearch[];

  const newCounts = items.length > 0 ? await fetchNewCounts(supabase, items) : {};

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">保存した検索</h1>
        {items.length > 0 && (
          <p className="text-xs text-slate-500">
            <Bell className="mr-1 inline h-3.5 w-3.5" />
            新着は毎日メールでお知らせします
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          保存した検索はありません。検索結果ページで「条件を保存」を押すと、ここから再表示できます。
          <div className="mt-4">
            <Link href="/listings" className="btn-primary">車を探す</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => {
            const newCount = newCounts[s.id] ?? 0;
            return (
              <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
                <Link href={searchHref(s.params as Record<string, string>)} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold hover:underline">{s.name}</p>
                    {newCount > 0 && (
                      <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                        新着 {newCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{describeSearch(s.params as Record<string, string>)}</p>
                  <p className="text-xs text-slate-400">
                    保存 {formatDate(s.created_at)}
                    {s.last_checked_at && (
                      <span className="ml-2">・ 確認 {formatDate(s.last_checked_at)}</span>
                    )}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={searchHref(s.params as Record<string, string>)}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    <Search className="h-3.5 w-3.5" /> 表示
                  </Link>
                  <form action={deleteSavedSearch.bind(null, s.id)}>
                    <button
                      className="rounded-md border border-red-300 px-2 py-1.5 text-xs font-bold text-red-600"
                      aria-label="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
