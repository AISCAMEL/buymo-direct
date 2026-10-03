import { requireAdmin } from '@/lib/admin';
import { PREMIUM_CATEGORY_LABEL, PREMIUM_CATEGORY_CLS, PREMIUM_CATEGORIES, type PremiumResource } from '@/lib/premium';
import { addPremiumResource, togglePremiumResource, deletePremiumResource } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '有料会員コンテンツ | 管理' };

export default async function AdminPremiumPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('premium_resources')
    .select('id, category, title, summary, body, url, published, sort')
    .order('sort');
  const items = (data ?? []) as PremiumResource[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">有料会員コンテンツ</h1>
        <p className="text-sm text-slate-500">相場・仕入れ・資料・動画。公開中のものが有料会員・加盟店に表示されます。</p>
      </div>

      {/* 追加フォーム */}
      <form action={addPremiumResource} className="card grid gap-3 p-5 sm:grid-cols-2">
        <div><label className="label">カテゴリー</label>
          <select name="category" className="input" defaultValue="market">
            {PREMIUM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div><label className="label">並び順</label><input name="sort" type="number" className="input" defaultValue={0} /></div>
        <div className="sm:col-span-2"><label className="label">タイトル *</label><input name="title" required className="input" placeholder="例）今月の相場ハイライト" /></div>
        <div className="sm:col-span-2"><label className="label">概要</label><input name="summary" className="input" placeholder="一覧に表示される短い説明" /></div>
        <div className="sm:col-span-2"><label className="label">本文（任意）</label><textarea name="body" rows={3} className="input" placeholder="そのまま表示する本文（URLがあれば本文は省略可）" /></div>
        <div className="sm:col-span-2"><label className="label">リンクURL（任意）</label><input name="url" className="input" placeholder="https://… 外部資料・動画など" /></div>
        <div className="sm:col-span-2"><button className="btn-accent w-full">追加する</button></div>
      </form>

      {/* 一覧 */}
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id} className="card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-bold">
                <span className={`badge ${PREMIUM_CATEGORY_CLS[r.category] ?? 'bg-slate-100 text-slate-600'}`}>{PREMIUM_CATEGORY_LABEL[r.category] ?? r.category}</span>
                {!r.published && <span className="badge bg-slate-100 text-slate-500">非公開</span>}
                {r.title}
              </p>
              {r.summary && <p className="mt-1 text-sm text-slate-500">{r.summary}</p>}
              {r.url && <p className="mt-1 break-all text-xs text-navy-500">{r.url}</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
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
    </div>
  );
}
