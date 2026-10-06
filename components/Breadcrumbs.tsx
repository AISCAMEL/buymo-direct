import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { breadcrumbJsonLd, type Crumb } from '@/lib/seo';

/**
 * 表示用パンくず＋BreadcrumbList 構造化データ。
 * items の最後の要素は現在地（リンクにしない）。url は JSON-LD 用に絶対URLで渡す。
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(items)) }}
      />
      <nav aria-label="パンくず" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          const path = c.url.replace(/^https?:\/\/[^/]+/, '') || '/';
          return (
            <span key={c.url} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              {last ? (
                <span className="font-bold text-slate-700">{c.name}</span>
              ) : (
                <Link href={path} className="hover:text-teal-700 hover:underline">
                  {c.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
