import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { resolveActor, getSheet, canAccess } from '@/lib/inspection';
import { InspectionSheetView } from '@/components/inspection/InspectionSheet';

export const dynamic = 'force-dynamic';

export default async function AdminInspectionSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const actor = await resolveActor();
  const sheet = await getSheet(id);
  if (!actor || !sheet || !canAccess(actor, sheet)) notFound();

  return <InspectionSheetView sheet={sheet} basePath="/admin/inspections" />;
}
