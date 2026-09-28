import { requireDealer } from '@/lib/dealer';
import { DealerSettingsForm } from '@/components/DealerSettingsForm';
import type { Dealer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DealerSettingsPage() {
  const { supabase, dealer } = await requireDealer() as any;

  const { data } = await (supabase as any)
    .from('dealers')
    .select('*')
    .eq('id', dealer.dealerId)
    .maybeSingle();
  const d = data as (Dealer & Record<string, unknown>) | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black">店舗設定</h1>
        <p className="text-sm text-slate-500">入力した内容は「車のプロを探す」の公開プロフィールに表示され、集客につながります。</p>
      </div>

      <DealerSettingsForm d={d} isOwner={dealer.isOwner} />

      <div className="card p-5">
        <h2 className="mb-2 text-sm font-bold text-slate-700">本部設定（読み取り専用）</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">成約手数料率</dt><dd className="font-bold">{d?.commission_rate ?? 3}%</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">ステータス</dt><dd className="font-bold">{{ pending: '審査中', approved: '承認済み', suspended: '停止中' }[d?.status ?? 'pending']}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-slate-400">手数料率・ステータスは本部管理画面からのみ変更できます。</p>
      </div>
    </div>
  );
}
