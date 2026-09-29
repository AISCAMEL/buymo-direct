import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { LearningForm } from '@/components/LearningForm';
import { createLearning, toggleLearningPublished } from '@/app/admin/learn/actions';
import { LEARN_CATEGORY_LABEL, LEARN_CATEGORY_CLS, type LearningContent } from '@/lib/learn';

export const dynamic = 'force-dynamic';

export default async function AdminLearnPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('learning_contents').select('*').order('sort');
  const items = (data ?? []) as LearningContent[];

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-black"><GraduationCap className="h-6 w-6 text-navy-500" />学習コンテンツ（買取を学ぶ）</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-black">講座一覧（{items.length}）</h2>
        {items.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">講座はまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {c.category && <span className={`badge ${LEARN_CATEGORY_CLS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{LEARN_CATEGORY_LABEL[c.category] ?? c.category}</span>}
                    {c.title}
                    <span className={`badge ${c.is_premium ? 'bg-accent-100 text-accent-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.is_premium ? '有料' : '無料'}</span>
                    <span className={`badge ${c.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.published ? '公開' : '非公開'}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">/{c.slug}</p>
                </div>
                <div className="flex gap-1">
                  <form action={toggleLearningPublished.bind(null, c.id, !c.published)}>
                    <button className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">{c.published ? '非公開に' : '公開する'}</button>
                  </form>
                  <Link href={`/admin/learn/${c.id}`} className="rounded-md border border-navy-300 px-2.5 py-1 text-xs font-bold text-navy-700 hover:bg-navy-50">編集</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-black">新規講座を追加</h2>
        <LearningForm action={createLearning} />
      </section>
    </div>
  );
}
