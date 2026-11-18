import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { resolveActor, getSheet, canAccess } from '@/lib/inspection';
import { InspectionEditor } from '@/components/inspection/InspectionEditor';

export const dynamic = 'force-dynamic';

export default async function AdminInspectionEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const actor = await resolveActor();
  const sheet = await getSheet(id);
  if (!actor || !sheet || !canAccess(actor, sheet)) notFound();

  return (
    <div className="space-y-3">
      <Link href="/admin/inspections" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 査定表一覧
      </Link>
      <InspectionEditor sheet={sheet} basePath="/admin/inspections" />
    </div>
  );
}
