import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { PremiumGate } from '@/components/PremiumGate';
import { LEARN_CATEGORY_LABEL, LEARN_CATEGORY_CLS, type LearningContent } from '@/lib/learn';

export const dynamic = 'force-dynamic';

export default async function LearnDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const access = await getViewerAccess();

  const { data } = await supabase
    .from('learning_contents')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (!data) notFound();
  const c = data as LearningContent;
  const unlocked = !c.is_premium || access.premium;

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-6">
      <Link href="/learn" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 講座一覧へ
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {c.category && <span className={`badge ${LEARN_CATEGORY_CLS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{LEARN_CATEGORY_LABEL[c.category] ?? c.category}</span>}
        {c.is_premium ? <span className="badge bg-accent-100 text-accent-700">有料</span> : <span className="badge bg-emerald-100 text-emerald-700">無料</span>}
      </div>
      <h1 className="text-2xl font-black leading-snug">{c.title}</h1>
      {c.summary && <p className="text-slate-600">{c.summary}</p>}

      <PremiumGate
        unlocked={unlocked}
        loggedIn={access.loggedIn}
        source={`learn:${c.slug}`}
        title="この講座は有料会員・加盟店限定です"
        note="実践編の全文は、有料会員・加盟店・本部のみ閲覧できます。まずは無料のプロ登録から。"
      >
        <div className="card whitespace-pre-wrap p-6 leading-relaxed text-slate-700">
          {c.body ?? '本文は準備中です。'}
        </div>
      </PremiumGate>
    </div>
  );
}
