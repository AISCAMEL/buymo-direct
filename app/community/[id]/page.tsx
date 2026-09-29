import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Pin, Trash2, Heart, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { formatDateTime } from '@/lib/format';
import { addComment, togglePin, deletePost, toggleResolved, toggleLike } from '@/app/community/actions';
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
    .select('*, author:profiles!community_comments_author_id_fkey(display_name, role)')
    .eq('post_id', id)
    .order('created_at');
  const comments = (cmts ?? []) as any[];

  // いいね（件数・自分の状態）
  const { count: likeCount } = await supabase
    .from('community_post_likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', id);
  let liked = false;
  if (access.userId) {
    const { data: myLike } = await supabase
      .from('community_post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', access.userId)
      .maybeSingle();
    liked = !!myLike;
  }

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
          {p.resolved && <span className="badge inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" />解決済み</span>}
          <span className={`badge ${COMMUNITY_CATEGORY_CLS[p.category] ?? 'bg-slate-100 text-slate-600'}`}>{COMMUNITY_CATEGORY_LABEL[p.category] ?? p.category}</span>
        </div>
        <h1 className="text-xl font-black leading-snug">{p.title}</h1>
        <p className="text-xs text-slate-400">{authorName} ・ {formatDateTime(p.created_at)}</p>
        {p.body && <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{p.body}</div>}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <form action={toggleLike.bind(null, p.id)}>
            <button className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold ${liked ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />いいね {likeCount ?? 0}
            </button>
          </form>
          {canManage && (
            <form action={toggleResolved.bind(null, p.id, !p.resolved)}>
              <button className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                <CheckCircle2 className="h-3.5 w-3.5" />{p.resolved ? '未解決に戻す' : '解決済みにする'}
              </button>
            </form>
          )}
          {access.isAdmin && (
            <form action={togglePin.bind(null, p.id, !p.pinned)}>
              <button className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
                {p.pinned ? 'ピン留め解除' : 'ピン留め'}
              </button>
            </form>
          )}
          {canManage && (
            <form action={deletePost.bind(null, p.id)}>
              <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />削除
              </button>
            </form>
          )}
        </div>
      </article>

      {/* コメント */}
      <section className="space-y-2">
        <h2 className="text-lg font-black">コメント（{comments.length}）</h2>
        {comments.map((c) => {
          const isOfficial = c.author?.role === 'admin';
          return (
            <div key={c.id} className={`card p-4 ${isOfficial ? 'border-navy-200 bg-navy-50/40' : ''}`}>
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-bold text-slate-600">{isOfficial ? '運営' : (c.author?.display_name ?? 'メンバー')}</span>
                {isOfficial && <span className="badge bg-navy-500 text-white">運営回答</span>}
                <span>{formatDateTime(c.created_at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
            </div>
          );
        })}

        <form action={addComment.bind(null, p.id)} className="card space-y-2 p-4">
          <textarea name="body" rows={3} required className="input" placeholder="返信・アドバイスを書く（外部連絡先は書かないでください）" />
          <button type="submit" className="btn-accent">コメントする</button>
        </form>
      </section>
    </div>
  );
}
