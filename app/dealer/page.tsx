import { redirect } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import type { SearchParams } from 'next/dist/server/request/search-params';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DealerIndexPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer');

  const ctx = await getDealerForUser(user.id);
  if (ctx) redirect('/dealer/dashboard');

  return (
    <div className="mx-auto max-w-lg space-y-6 py-10">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-navy-500" />
        <h1 className="text-2xl font-black">加盟店として出品する</h1>
      </div>

      {sp.applied && (
        <div className="card bg-emerald-50 p-5 text-emerald-700">
          <p className="font-bold">申込みが完了しました！</p>
          <p className="text-sm">本部が審査を完了するまでお待ちください（通常1〜3営業日）。</p>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <p className="text-sm text-slate-600">
          BUYMO は「買取」と「ダイレクト販売」を1つにした統合サービスです。加盟店プログラムに参加すると、
          複数台の在庫を一元管理し、外部の在庫管理システム（DMS）と API で連携できます。
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          {[
            '在庫は BUYMO 買取保証つきで販売（売れ残りリスクを軽減）',
            '在庫一括管理・スタッフアカウント追加',
            'REST API で外部 DMS と在庫同期',
            '取引完了時の Webhook 通知',
            '専用ショップページ（/dealers/[id]）',
            '成約手数料レート個別設定（本部審査後）',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-navy-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <a href="/dealer/register" className="btn-accent flex items-center justify-center gap-2">
          加盟店として申し込む <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
