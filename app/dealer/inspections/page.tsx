import { redirect } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { resolveActor, listSheets } from '@/lib/inspection';
import { InspectionList } from '@/components/inspection/InspectionList';

export const dynamic = 'force-dynamic';

export default async function DealerInspectionsPage() {
  const actor = await resolveActor();
  if (!actor) redirect('/login?redirect=/dealer/inspections');
  const sheets = await listSheets(actor);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <ClipboardCheck className="h-6 w-6 text-accent-600" /> 査定表（現車検査）
        </h1>
        <p className="text-sm text-slate-500">
          スマホ・iPadで現車を検査し、お客様に提示できる「提案用」と社内記録の「保管用」を作成できます。
        </p>
      </div>
      <InspectionList basePath="/dealer/inspections" initial={sheets} />
    </div>
  );
}
