import { requireAdmin } from '@/lib/admin';
import { ClipboardCheck } from 'lucide-react';
import { resolveActor, listSheets } from '@/lib/inspection';
import { InspectionList } from '@/components/inspection/InspectionList';

export const dynamic = 'force-dynamic';

export default async function AdminInspectionsPage() {
  await requireAdmin();
  const actor = await resolveActor();
  const sheets = actor ? await listSheets(actor) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <ClipboardCheck className="h-6 w-6 text-accent-600" /> 査定表（現車検査）
        </h1>
        <p className="text-sm text-slate-500">
          スマホ・iPadで現車を検査し、お客様提示用の「提案用」と社内記録の「保管用」を作成・印刷できます。本部は全店の査定表を閲覧できます。
        </p>
      </div>
      <InspectionList basePath="/admin/inspections" initial={sheets} />
    </div>
  );
}
