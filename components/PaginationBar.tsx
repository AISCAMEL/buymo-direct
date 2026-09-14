import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageHref(base: Record<string, string | undefined>, page: number): string {
  const sp = new URLSearchParams();
  Object.entries(base).forEach(([k, v]) => { if (v) sp.set(k, v); });
  if (page <= 1) sp.delete('page');
  else sp.set('page', String(page));
  const qs = sp.toString();
  return qs ? `/listings?${qs}` : '/listings';
}

export function PaginationBar({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  // 最大5ページ分のリンクを表示（前後2ページ + 現在）
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
    pages.push(p);
  }

  return (
    <nav className="flex items-center justify-center gap-1 pt-8" aria-label="ページネーション">
      {page > 1 ? (
        <Link href={pageHref(searchParams, page - 1)} className="btn-outline p-2 text-sm">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn-outline cursor-default p-2 text-sm opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pages[0] > 1 && (
        <>
          <Link href={pageHref(searchParams, 1)} className="btn-outline px-3 py-2 text-sm">1</Link>
          {pages[0] > 2 && <span className="px-1 text-slate-400">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(searchParams, p)}
          className={`px-3 py-2 text-sm font-bold rounded-lg ${
            p === page
              ? 'bg-navy-600 text-white border border-navy-600'
              : 'btn-outline'
          }`}
        >
          {p}
        </Link>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
          <Link href={pageHref(searchParams, totalPages)} className="btn-outline px-3 py-2 text-sm">{totalPages}</Link>
        </>
      )}

      {page < totalPages ? (
        <Link href={pageHref(searchParams, page + 1)} className="btn-outline p-2 text-sm">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn-outline cursor-default p-2 text-sm opacity-30">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
