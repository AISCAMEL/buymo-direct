import Link from 'next/link';
import { GraduationCap, Lock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { LEARN_CATEGORY_LABEL, LEARN_CATEGORY_CLS, type LearningContent } from '@/lib/learn';

export const dynamic = 'force-dynamic';
export const metadata = { title: '買取を学ぶ | BUYMO ダイレクト' };

export default async function LearnPage() {
  const supabase = await createClient();
  const access = await getViewerAccess();

  const { data } = await supabase
    .from('learning_contents')
    .select('id, slug, title, summary, category, is_premium, published, sort')
    .eq('published', true)
    .order('sort');
  const items = (data ?? []) as LearningContent[];

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-xs font-black text-navy-600">
          <GraduationCap className="h-3.5 w-3.5" /> オンライン講座
        </span>
        <h1 className="mt-3 text-3xl font-black">買取を学ぶ</h1>
        <p className="mt-2 text-sm text-slate-600">
          査定・相場・仕入れ・法令まで。プロの買取ノウハウをオンラインで。
          <br />基礎は無料、実践編は<strong>有料会員・加盟店</strong>限定です。
        </p>
      </div>

      {!access.premium && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-200 bg-gold-50/60 p-4">
          <p className="text-sm font-bold text-gold-700">実践編（査定・相場・仕入れ）は有料会員限定です。</p>
          <Link href={access.loggedIn ? '/membership?from=learn' : '/join?source=learn'} className="btn-accent shrink-0 text-sm">
            {access.loggedIn ? '有料会員になる' : '無料登録ではじめる'}
          </Link>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((c) => {
          const locked = c.is_premium && !access.premium;
          return (
            <li key={c.id}>
              <Link href={`/learn/${c.slug}`} className="card flex items-start justify-between gap-3 p-4 transition hover:shadow-md">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {c.category && <span className={`badge ${LEARN_CATEGORY_CLS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{LEARN_CATEGORY_LABEL[c.category] ?? c.category}</span>}
                    {c.title}
                    {c.is_premium && <span className="badge bg-accent-100 text-accent-700">有料</span>}
                    {!c.is_premium && <span className="badge bg-emerald-100 text-emerald-700">無料</span>}
                  </p>
                  {c.summary && <p className="mt-1 text-sm text-slate-500">{c.summary}</p>}
                </div>
                {locked ? <Lock className="mt-1 h-4 w-4 shrink-0 text-slate-300" /> : <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent-400" />}
              </Link>
            </li>
          );
        })}
        {items.length === 0 && <li className="card p-10 text-center text-sm text-slate-500">講座は準備中です。</li>}
      </ul>
    </div>
  );
}
