import { requireDealer } from '@/lib/dealer';
import { updateDealerProfile } from '@/app/dealer/actions';
import { PREFECTURES } from '@/lib/constants';
import type { Dealer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DealerSettingsPage() {
  const { supabase, dealer } = await requireDealer() as any;

  const { data } = await (supabase as any)
    .from('dealers')
    .select('*')
    .eq('id', dealer.dealerId)
    .maybeSingle();
  const d = data as Dealer | null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-black">店舗設定</h1>

      <form action={updateDealerProfile} className="card space-y-5 p-6">
        <div>
          <label className="label">店舗名 *</label>
          <input name="name" required className="input" defaultValue={d?.name ?? ''} />
        </div>
        <div>
          <label className="label">法人名</label>
          <input name="company_name" className="input" defaultValue={d?.company_name ?? ''} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">都道府県</label>
            <select name="prefecture" className="input" defaultValue={d?.prefecture ?? ''}>
              <option value="">選択</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">電話番号</label>
            <input name="phone" type="tel" className="input" defaultValue={d?.phone ?? ''} />
          </div>
        </div>
        <div>
          <label className="label">住所</label>
          <input name="address" className="input" defaultValue={d?.address ?? ''} />
        </div>
        <div>
          <label className="label">公式サイト URL</label>
          <input name="website_url" type="url" className="input" defaultValue={d?.website_url ?? ''} />
        </div>
        <div>
          <label className="label">店舗紹介文</label>
          <textarea name="description" rows={4} className="input" defaultValue={d?.description ?? ''} />
        </div>

        {!dealer.isOwner && (
          <p className="text-xs text-slate-400">※ 設定変更はオーナーのみ可能です。</p>
        )}

        <button type="submit" disabled={!dealer.isOwner} className="btn-accent w-full disabled:opacity-50">
          保存する
        </button>
      </form>

      <div className="card p-5">
        <h2 className="mb-2 font-bold text-sm text-slate-700">本部設定（読み取り専用）</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">成約手数料率</dt>
            <dd className="font-bold">{d?.commission_rate ?? 3}%</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">ステータス</dt>
            <dd className="font-bold">{{ pending: '審査中', approved: '承認済み', suspended: '停止中' }[d?.status ?? 'pending']}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-400">手数料率・ステータスは本部管理画面からのみ変更できます。</p>
      </div>
    </div>
  );
}
