import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { PremiumResourceForm } from '@/components/PremiumResourceForm';
import { isPlayableVideo } from '@/lib/video';
import { PREMIUM_CATEGORY_LABEL, PREMIUM_CATEGORY_CLS, type PremiumResource } from '@/lib/premium';
import { addPremiumResource, togglePremiumResource, deletePremiumResource } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '有料会員コンテンツ | 管理' };

export default async function AdminPremiumPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('premium_resources')
    .select('id, category, title, summary, body, url, video_url, published, sort')
    .order('sort');
  const items = (data ?? []) as PremiumResource[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">有料会員コンテンツ</h1>
        <p className="text-sm text-slate-500">相場・仕入れ・資料・動画。公開中のものが有料会員・加盟店に表示されます。</p>
      </div>

      {/* 一覧 */}
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id} className="card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-bold">
                <span className={`badge ${PREMIUM_CATEGORY_CLS[r.category] ?? 'bg-slate-100 text-slate-600'}`}>{PREMIUM_CATEGORY_LABEL[r.category] ?? r.category}</span>
                {isPlayableVideo(r.video_url) && <span className="badge inline-flex items-center gap-1 bg-rose-100 text-rose-700"><PlayCircle className="h-3 w-3" />動画</span>}
                {!r.published && <span className="badge bg-slate-100 text-slate-500">非公開</span>}
                {r.title}
              </p>
              {r.summary && <p className="mt-1 text-sm text-slate-500">{r.summary}</p>}
              {r.url && <p className="mt-1 break-all text-xs text-navy-500">{r.url}</p>}
              {r.video_url && <p className="mt-1 break-all text-xs text-rose-500">🎬 {r.video_url}</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <Link href={`/admin/premium/${r.id}`} className="w-full rounded-lg border border-navy-300 px-3 py-1.5 text-center text-xs font-bold text-navy-700 hover:bg-navy-50">編集</Link>
              <form action={togglePremiumResource.bind(null, r.id, !r.published)}>
                <button className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">{r.published ? '非公開にする' : '公開する'}</button>
              </form>
              <form action={deletePremiumResource.bind(null, r.id)}>
                <button className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">削除</button>
              </form>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="card p-10 text-center text-sm text-slate-500">まだありません。</li>}
      </ul>

      {/* 追加フォーム */}
      <section className="space-y-2">
        <h2 className="text-lg font-black">新規コンテンツを追加</h2>
        <PremiumResourceForm action={addPremiumResource} submitLabel="追加する" />
      </section>
    </div>
  );
}
