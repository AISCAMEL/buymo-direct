import Link from 'next/link';
import { Users, Pin, MessageCircle, Plus, ShieldCheck, Heart, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { BusinessOnlyGate } from '@/components/BusinessOnlyGate';
import { formatDateTime } from '@/lib/format';
import { COMMUNITY_CATEGORY_LABEL, COMMUNITY_CATEGORY_CLS } from '@/lib/community';

export const dynamic = 'force-dynamic';
export const metadata = { title: '買取コミュニティ | BUYMO ダイレクト' };

type Row = {
  id: string; category: string; title: string; pinned: boolean; resolved: boolean; created_at: string;
  author?: { display_name: string | null } | null;
  comments?: { count: number }[];
  likes?: { count: number }[];
};

export default async function CommunityPage() {
  const access = await getViewerAccess();

  // 未ログインは参加案内。
  if (!access.loggedIn) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <Users className="mx-auto h-12 w-12 text-navy-300" />
        <h1 className="text-2xl font-black">買取コミュニティ</h1>
        <p className="text-sm text-slate-600">
          買取に取り組むプロ・加盟店のための交流の場です。初心者の方も安心して質問・相談でき、運営が見守っています。
        </p>
        <div className="card p-5 text-left text-sm text-slate-600">
          <p className="font-bold text-slate-800">参加するには</p>
          <p className="mt-1">加盟店・プロ登録（無料）でご利用いただけます。</p>
        </div>
        <Link href="/join?source=community" className="btn-accent inline-flex">加盟店・プロ登録（無料）へ</Link>
      </div>
    );
  }

  // 個人（一般会員）には買取系を提供しない。業者になる入口を案内。
  // 業者トラック（スキル登録・買取加盟・加盟店・有料会員）はそのまま閲覧・参加可。
  if (!access.businessTrack) {
    return <BusinessOnlyGate feature="買取コミュニティ" source="community" />;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('community_posts')
    .select('id, category, title, pinned, resolved, created_at, author:profiles!community_posts_author_id_fkey(display_name), comments:community_comments(count), likes:community_post_likes(count)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-black"><Users className="h-6 w-6 text-navy-500" />買取コミュニティ</h1>
        <Link href="/community/new" className="btn-accent flex items-center gap-1 text-sm"><Plus className="h-4 w-4" />投稿する</Link>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>初心者の方も安心して質問できます。誹謗中傷・個人情報・外部連絡先の書き込みは禁止です（自動で保護されます）。運営が見守っています。</p>
      </div>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">まだ投稿がありません。最初の質問を投稿してみましょう。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/community/${p.id}`} className="card block p-4 hover:shadow-md">
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  {p.pinned && <Pin className="h-3.5 w-3.5 text-navy-500" />}
                  {p.resolved && <span className="badge inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" />解決済み</span>}
                  <span className={`badge ${COMMUNITY_CATEGORY_CLS[p.category] ?? 'bg-slate-100 text-slate-600'}`}>{COMMUNITY_CATEGORY_LABEL[p.category] ?? p.category}</span>
                  {p.title}
                </p>
                <p className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span>{p.category === 'official' ? '運営' : (p.author?.display_name ?? 'メンバー')}</span>
                  <span>{formatDateTime(p.created_at)}</span>
                  <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{p.comments?.[0]?.count ?? 0}</span>
                  <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{p.likes?.[0]?.count ?? 0}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
