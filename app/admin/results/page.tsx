import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { RESULT_SCENES, getResultUrlMap } from '@/lib/customer-results';
import { AdminResults } from '@/components/AdminResults';
import { Images } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminResultsPage() {
  await requireAdmin();
  const aiOn = isAiEnabled();
  const initial = await getResultUrlMap();
  const scenes = RESULT_SCENES.map((s) => ({ key: s.key, label: s.label }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Images className="h-6 w-6 text-accent-600" /> ご利用実績 画像生成
        </h1>
        <p className="text-sm text-slate-500">
          AIが「ご利用実績」用の写真を一括生成し、トップページに自動表示します。
        </p>
      </div>

      <AdminResults scenes={scenes} initial={initial} aiOn={aiOn} />
    </div>
  );
}
