import { Tag, ToggleLeft, ToggleRight, Trash2, Gift } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { createCoupon, toggleCoupon, deleteCoupon } from './actions';
import type { Coupon } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  const coupons = (data ?? []) as Coupon[];

  const now = new Date();
  const activeCount = coupons.filter((c) => c.active && (!c.expires_at || new Date(c.expires_at) > now) && (c.max_uses == null || c.used_count < c.max_uses)).length;
  const totalUsed = coupons.reduce((s, c) => s + (c.used_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black">クーポン管理</h1>
        </div>
        <div className="flex gap-3">
          {[
            { label: '総数', val: coupons.length, cls: 'text-navy-700 bg-navy-50' },
            { label: '有効', val: activeCount, cls: 'text-emerald-700 bg-emerald-50' },
            { label: '総使用回数', val: totalUsed, cls: 'text-accent-600 bg-accent-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-4 py-2 text-center ${s.cls}`}>
              <p className="text-xl font-black">{s.val.toLocaleString()}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 新規作成 */}
      <form action={createCoupon} className="card space-y-4 border-2 border-dashed border-navy-200 p-5">
        <h2 className="flex items-center gap-2 font-bold"><Gift className="h-4 w-4 text-navy-500" /> 新規クーポン作成</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label text-xs">クーポンコード *</label>
            <input name="code" required className="input text-sm uppercase" placeholder="SUMMER10" />
          </div>
          <div>
            <label className="label text-xs">タイプ *</label>
            <select name="type" className="input text-sm">
              <option value="fixed">固定額割引（円）</option>
              <option value="percent">パーセント割引（%）</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">割引額・率 *</label>
            <input name="value" type="number" min={1} required className="input text-sm" placeholder="1000" />
          </div>
          <div>
            <label className="label text-xs">最低購入額（円）</label>
            <input name="min_amount" type="number" min={0} className="input text-sm" placeholder="0（無制限）" />
          </div>
          <div>
            <label className="label text-xs">最大使用回数</label>
            <input name="max_uses" type="number" min={1} className="input text-sm" placeholder="空欄で無制限" />
          </div>
          <div>
            <label className="label text-xs">有効期限</label>
            <input name="expires_at" type="datetime-local" className="input text-sm" />
          </div>
        </div>
        <button className="btn-accent">作成する</button>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>{['コード', 'タイプ', '割引', '最低額', '使用状況', '有効期限', '状態', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">クーポンはありません。上のフォームから作成してください。</td></tr>
              ) : coupons.map((c) => {
                const isExpired = c.expires_at != null && new Date(c.expires_at) < now;
                const isMaxed = c.max_uses != null && c.used_count >= c.max_uses;
                const isValid = c.active && !isExpired && !isMaxed;
                return (
                  <tr key={c.id} className={!isValid ? 'opacity-60' : ''}>
                    <td className="px-4 py-3 font-mono font-black tracking-wider text-navy-700">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.type === 'fixed' ? 'bg-navy-50 text-navy-700' : 'bg-gold-100 text-gold-600'}`}>
                        {c.type === 'fixed' ? '固定額' : 'パーセント'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-accent-600">{c.type === 'fixed' ? `¥${c.value.toLocaleString()}` : `${c.value}%`}</td>
                    <td className="px-4 py-3 text-slate-500">{c.min_amount ? `¥${c.min_amount.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3"><span className="font-bold">{c.used_count.toLocaleString()}</span>{c.max_uses != null && <span className="text-slate-400"> / {c.max_uses.toLocaleString()}</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ja-JP') : '無期限'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isValid ? 'bg-emerald-100 text-emerald-700' : isMaxed ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {!c.active ? '無効' : isExpired ? '期限切れ' : isMaxed ? '上限達成' : '有効'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <form action={toggleCoupon.bind(null, c.id, !c.active)}>
                          <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title={c.active ? '無効化' : '有効化'}>
                            {c.active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
                          </button>
                        </form>
                        <form action={deleteCoupon.bind(null, c.id)}>
                          <button className="rounded-md p-1.5 text-red-500 hover:bg-red-50" title="削除"><Trash2 className="h-4 w-4" /></button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
