import { requireAdmin } from '@/lib/admin';
import { ClipboardList } from 'lucide-react';
import { listHearing } from '@/lib/hearing';
import { HearingList } from '@/components/HearingList';

export const dynamic = 'force-dynamic';

export default async function AdminHearingPage() {
  await requireAdmin();
  const sheets = await listHearing(null);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><ClipboardList className="h-6 w-6 text-accent-600" /> ヒアリング（出張・来店査定）</h1>
        <p className="text-sm text-slate-500">店舗QR・ヒアリングフォームから届いた聞き取り内容の一覧です。印刷用の白紙は /hearing/print。</p>
      </div>
      <HearingList sheets={sheets} />
    </div>
  );
}
