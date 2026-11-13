import { requireAdmin } from '@/lib/admin';
import { runAiMonitor } from '@/lib/monitor';
import { AdminMonitor } from '@/components/AdminMonitor';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminMonitorPage() {
  await requireAdmin();
  const report = await runAiMonitor();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Activity className="h-6 w-6 text-accent-600" /> AI監視センター
        </h1>
        <p className="text-sm text-slate-500">
          取引・審査・申込・通報などのキューをAIが自動で点検し、要対応・注意を優先度つきで表示します。
        </p>
      </div>

      <AdminMonitor initial={report} />
    </div>
  );
}
