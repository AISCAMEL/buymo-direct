import { notFound, redirect } from 'next/navigation';
import { resolveActor, getSheet, canAccess } from '@/lib/inspection';
import { InspectionSheetView } from '@/components/inspection/InspectionSheet';

export const dynamic = 'force-dynamic';

export default async function DealerInspectionSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveActor();
  if (!actor) redirect('/login?redirect=/dealer/inspections');
  const sheet = await getSheet(id);
  if (!sheet || !canAccess(actor, sheet)) notFound();

  return <InspectionSheetView sheet={sheet} basePath="/dealer/inspections" />;
}
