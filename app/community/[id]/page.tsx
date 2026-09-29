import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Pin, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { formatDateTime } from '@/lib/format';
import { addComment, togglePin, deletePost } from '@/app/community/actions';
import { COMMUNITY_CATEGORY_LABEL, COMMUNITY_CATEGORY_CLS } from '@/lib/community';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getViewerAccess();
  if (!access.premium) redirect('/community');

  const supabase = await createClient();
  const { data: post } = await supabase
    .from('community_posts')
    .select('*, author:profiles!community_posts_author_id_fkey(display_name)')
    .eq('id', id)
    .maybeSingle();
  if (!post) notFound();

  const { data: cmts } = await supabase
    .from('community_comments')
    .select('*, author:profiles!community_comments_author_id_fkey(display_name)')
    .eq('post_id', id)
    .order('created_at');
  const comments = (cmts ?? []) as any[];

  const p = post as any;
  const canManage = access.isAdmin || p.author_id === access.userId;
  const authorName = p.category === 'official' ? '運営' : (p.author?.display_name ?? 'メンバー');

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-6">
      <Link href="/community" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> コミュニティへ
      </Link>

      <article className="card space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {p.pinned && <Pin className="h-4 w-4 text-navy-500" />}
          <span className={`badge ${COMMUNITY_CATEGORY_CLS[p.category] ?? 'bg-slate-100 text-slate-600'}`}>{COMMUNITY_CATEGORY_LABEL[p.category] ?? p.category}</span>
        </div>
        <h1 className="text-xl font-black leading-snug">{p.title}</h1>
        <p className="text-xs text-slate-400">{authorName} ・ {formatDateTime(p.created_at)}</p>
        {p.body && <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{p.body}</div>}

        {canManage && (
          <div className="flex gap-2 border-t border-slate-100 pt-3">
            {access.isAdmin && (
              <form action={togglePin.bind(null, p.id, !p.pinned)}>
                <button className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  {p.pinned ? 'ピン留め解除' : 'ピン留め'}
                </button>
              </form>
            )}
            <form action={deletePost.bind(null, p.id)}>
              <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />削除
              </button>
            </form>
          </div>
        )}
      </article>

      {/* コメント */}
      <section className="space-y-2">
        <h2 className="text-lg font-black">コメント（{comments.length}）</h2>
        {comments.map((c) => (
          <div key={c.id} className="card p-4">
            <p className="text-xs text-slate-400">{c.author?.display_name ?? 'メンバー'} ・ {formatDateTime(c.created_at)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
          </div>
        ))}

        <form action={addComment.bind(null, p.id)} className="card space-y-2 p-4">
          <textarea name="body" rows={3} required className="input" placeholder="返信・アドバイスを書く（外部連絡先は書かないでください）" />
          <button type="submit" className="btn-accent">コメントする</button>
        </form>
      </section>
    </div>
  );
}
