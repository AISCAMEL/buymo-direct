import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolveActor, getSheet, canAccess } from '@/lib/inspection';
import { InspectionEditor } from '@/components/inspection/InspectionEditor';

export const dynamic = 'force-dynamic';

export default async function DealerInspectionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveActor();
  if (!actor) redirect('/login?redirect=/dealer/inspections');
  const sheet = await getSheet(id);
  if (!sheet || !canAccess(actor, sheet)) notFound();

  return (
    <div className="space-y-3">
      <Link href="/dealer/inspections" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 査定表一覧
      </Link>
      <InspectionEditor sheet={sheet} basePath="/dealer/inspections" />
    </div>
  );
}
