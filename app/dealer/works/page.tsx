import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Images, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { WorkCaseForm } from '@/components/WorkCaseForm';
import { WORK_CASE_CATEGORY_CLS, type WorkCase } from '@/lib/work-cases';
import { createWorkCase, toggleWorkCasePublished } from '@/app/dealer/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '作業事例 | 加盟店管理' };

export default async function DealerWorksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/works');
  const { data: dealer } = await supabase.from('dealers').select('id').eq('owner_id', user.id).maybeSingle();
  if (!dealer) redirect('/dealer/register');

  const { data, error } = await supabase
    .from('dealer_work_cases')
    .select('id, dealer_id, category, title, description, before_url, after_url, price, duration, car_name, customer_name, customer_voice, rating, work_date, published, sort')
    .eq('dealer_id', (dealer as { id: string }).id)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false });
  const items = (data ?? []) as WorkCase[];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Images className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">作業事例（施工事例）</h1>
      </div>
      <p className="text-sm text-slate-500">ビフォーアフター写真や料金・お客様の声を登録すると、あなたの公開ページ（詳しく見る）に「作業事例」として表示されます。</p>

      {error ? (
        <div className="card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          作業事例テーブルがまだ準備中です。本部にて1回だけデータベース更新（migration 20240783）が必要です。反映後にこの画面から登録できます。
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-black">登録済みの事例（{items.length}）</h2>
            {items.length === 0 ? (
              <p className="card p-6 text-center text-sm text-slate-500">まだ事例がありません。下のフォームから追加できます。</p>
            ) : (
              <ul className="space-y-2">
                {items.map((c) => (
                  <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100">
                        {c.before_url ? <img src={c.before_url} alt="" className="h-full w-1/2 object-cover" /> : <span className="flex h-full w-1/2 items-center justify-center bg-slate-100 text-sm">🚗</span>}
                        {c.after_url ? <img src={c.after_url} alt="" className="h-full w-1/2 object-cover" /> : <span className="flex h-full w-1/2 items-center justify-center bg-emerald-50 text-sm">✨</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold">
                          {c.category && <span className={`badge ${WORK_CASE_CATEGORY_CLS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{c.category}</span>}
                          <span className="truncate">{c.title}</span>
                          <span className={`badge ${c.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.published ? '公開' : '非公開'}</span>
                        </p>
                        {c.price != null && <p className="mt-0.5 text-xs text-slate-400">¥{c.price.toLocaleString('ja-JP')}{c.duration ? ` ・ ${c.duration}` : ''}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <form action={toggleWorkCasePublished.bind(null, c.id, !c.published)}>
                        <button className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">{c.published ? '非公開に' : '公開する'}</button>
                      </form>
                      <Link href={`/dealer/works/${c.id}`} className="inline-flex items-center gap-1 rounded-md border border-navy-300 px-2.5 py-1 text-xs font-bold text-navy-700 hover:bg-navy-50"><Pencil className="h-3 w-3" />編集</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black">新しい事例を追加</h2>
            <WorkCaseForm action={createWorkCase} submitLabel="事例を追加する" />
          </section>
        </>
      )}
    </div>
  );
}
