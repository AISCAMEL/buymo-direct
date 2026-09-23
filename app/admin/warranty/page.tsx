import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { getPricingConfig } from '@/lib/settings';
import { WarrantySimulator } from './WarrantySimulator';

export const dynamic = 'force-dynamic';

export default async function AdminWarrantyPage() {
  await requireAdmin();
  const c = await getPricingConfig();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">保証見積りの確認</h1>
      </div>
      <p className="text-sm text-slate-500">
        案件の条件を入力すると、お客様に提示される保証料（税込）を確認できます。国産・輸入車ともにPDF料金表に基づき自動計算します。
        現在の全体調整は <strong className="text-navy-700">{c.warrantyAdjustPercent >= 0 ? '+' : ''}{c.warrantyAdjustPercent}%</strong>
        （<Link href="/admin/settings" className="text-accent-600 underline">料金設定</Link>で変更）。
      </p>

      <WarrantySimulator adjustPercent={c.warrantyAdjustPercent} />
    </div>
  );
}
