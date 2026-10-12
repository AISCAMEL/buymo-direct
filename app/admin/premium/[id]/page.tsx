import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { PremiumResourceForm } from '@/components/PremiumResourceForm';
import type { PremiumResource } from '@/lib/premium';
import { updatePremiumResource, deletePremiumResource } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'コンテンツを編集 | 管理' };

export default async function AdminPremiumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('premium_resources')
    .select('id, category, title, summary, body, url, video_url, published, sort')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as PremiumResource;

  return (
    <div className="space-y-4">
      <Link href="/admin/premium" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 有料会員コンテンツ一覧へ
      </Link>
      <h1 className="text-2xl font-black">コンテンツを編集</h1>
      <PremiumResourceForm action={updatePremiumResource.bind(null, id)} initial={r} />
      <form action={deletePremiumResource.bind(null, id)}>
        <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">このコンテンツを削除</button>
      </form>
    </div>
  );
}
