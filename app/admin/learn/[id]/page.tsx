import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { LearningForm } from '@/components/LearningForm';
import { updateLearning, deleteLearning } from '@/app/admin/learn/actions';
import type { LearningContent } from '@/lib/learn';

export const dynamic = 'force-dynamic';

export default async function AdminLearnEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('learning_contents').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const c = data as LearningContent;

  return (
    <div className="space-y-4">
      <Link href="/admin/learn" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 学習コンテンツ一覧へ
      </Link>
      <h1 className="text-2xl font-black">講座を編集</h1>
      <LearningForm action={updateLearning.bind(null, id)} initial={c} />
      <form action={deleteLearning.bind(null, id)}>
        <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">この講座を削除</button>
      </form>
    </div>
  );
}
