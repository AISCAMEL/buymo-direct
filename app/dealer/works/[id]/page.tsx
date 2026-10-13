import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { WorkCaseForm } from '@/components/WorkCaseForm';
import type { WorkCase } from '@/lib/work-cases';
import { updateWorkCase, deleteWorkCase } from '@/app/dealer/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '作業事例を編集 | 加盟店管理' };

export default async function DealerWorkEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/works');
  const { data: dealer } = await supabase.from('dealers').select('id').eq('owner_id', user.id).maybeSingle();
  if (!dealer) redirect('/dealer/register');

  const { data } = await supabase
    .from('dealer_work_cases')
    .select('id, dealer_id, category, title, description, before_url, after_url, price, duration, car_name, customer_name, customer_voice, rating, work_date, published, sort')
    .eq('id', id)
    .eq('dealer_id', (dealer as { id: string }).id)
    .maybeSingle();
  if (!data) notFound();
  const c = data as WorkCase;

  return (
    <div className="space-y-4">
      <Link href="/dealer/works" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 作業事例一覧へ
      </Link>
      <h1 className="text-2xl font-black">作業事例を編集</h1>
      <WorkCaseForm action={updateWorkCase.bind(null, id)} initial={c} />
      <form action={deleteWorkCase.bind(null, id)}>
        <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">この事例を削除</button>
      </form>
    </div>
  );
}
