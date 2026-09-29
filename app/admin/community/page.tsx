import Link from 'next/link';
import { Users, Pin, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { togglePin, deletePost } from '@/app/community/actions';
import { COMMUNITY_CATEGORY_LABEL, COMMUNITY_CATEGORY_CLS } from '@/lib/community';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; category: string; title: string; pinned: boolean; resolved: boolean; created_at: string;
  author?: { display_name: string | null } | null;
  comments?: { count: number }[];
};

export default async function AdminCommunityPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('community_posts')
    .select('id, category, title, pinned, resolved, created_at, author:profiles!community_posts_author_id_fkey(display_name), comments:community_comments(count)')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-black"><Users className="h-6 w-6 text-navy-500" />コミュニティ管理</h1>
      <p className="text-sm text-slate-500">初心者が安心して使えるよう、運営として見守り・回答・モデレーションを行えます。投稿を開いて「運営」として回答するとバッジが付きます。</p>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">投稿はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {p.pinned && <Pin className="h-3.5 w-3.5 text-navy-500" />}
                    {p.resolved && <span className="badge bg-emerald-100 text-emerald-700">解決済み</span>}
                    <span className={`badge ${COMMUNITY_CATEGORY_CLS[p.category] ?? 'bg-slate-100 text-slate-600'}`}>{COMMUNITY_CATEGORY_LABEL[p.category] ?? p.category}</span>
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {p.category === 'official' ? '運営' : (p.author?.display_name ?? 'メンバー')} ・ {formatDateTime(p.created_at)} ・ コメント {p.comments?.[0]?.count ?? 0}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link href={`/community/${p.id}`} className="inline-flex items-center gap-1 rounded-md border border-navy-300 px-2.5 py-1 text-xs font-bold text-navy-700 hover:bg-navy-50">
                    <Eye className="h-3.5 w-3.5" />開く・回答
                  </Link>
                  <form action={togglePin.bind(null, p.id, !p.pinned)}>
                    <button className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">{p.pinned ? 'ピン解除' : 'ピン留め'}</button>
                  </form>
                  <form action={deletePost.bind(null, p.id)}>
                    <button className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50">削除</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
