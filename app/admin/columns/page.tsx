import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { loadDbColumns } from '@/lib/columns-db';
import { AdminColumnGenerate } from '@/components/AdminColumnGenerate';
import { BookOpen, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminColumnsPage() {
  await requireAdmin();
  const aiOn = isAiEnabled();
  const cols = await loadDbColumns(100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <BookOpen className="h-6 w-6 text-accent-600" /> コラム自動生成
        </h1>
        <p className="text-sm text-slate-500">
          AIが毎日1本、最新情報をもとにコラムを執筆・公開します（記事＝Claude／画像＝OpenRouter）。ここで手動生成と一覧確認ができます。
        </p>
      </div>

      <AdminColumnGenerate aiOn={aiOn} />

      <div className="card p-5">
        <h2 className="mb-3 font-bold">生成済みコラム（{cols.length}件）</h2>
        {cols.length === 0 ? (
          <p className="text-sm text-slate-500">まだ生成されたコラムはありません。上の「今すぐ1本生成」またはCron（毎朝）で作成されます。</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cols.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                {c.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumb_url} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-12 w-20 shrink-0 rounded-md bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy-800">{c.title}</p>
                  <p className="text-xs text-slate-400">
                    {c.cat}・{new Date(c.published_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <Link href={`/column/${c.slug}`} target="_blank" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> 表示
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
