'use client';

import { useState } from 'react';
import { Tag, ToggleLeft, ToggleRight, Trash2, Plus, Gift } from 'lucide-react';

type CouponType = 'fixed' | 'percent';

type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_amount: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

const DEMO_COUPONS: Coupon[] = [
  { id: 'c-001', code: 'WELCOME3000', type: 'fixed', value: 3000, min_amount: 100000, max_uses: 500, used_count: 312, expires_at: '2026-12-31T23:59:59', active: true, created_at: '2026-01-01' },
  { id: 'c-002', code: 'SUMMER10', type: 'percent', value: 10, min_amount: 200000, max_uses: 200, used_count: 87, expires_at: '2026-09-30T23:59:59', active: true, created_at: '2026-06-01' },
  { id: 'c-003', code: 'KYCSUCCESS', type: 'fixed', value: 1000, min_amount: null, max_uses: null, used_count: 1043, expires_at: null, active: true, created_at: '2026-01-01' },
  { id: 'c-004', code: 'NEWYEAR2026', type: 'percent', value: 5, min_amount: 500000, max_uses: 100, used_count: 100, expires_at: '2026-01-31T23:59:59', active: false, created_at: '2025-12-25' },
  { id: 'c-005', code: 'DEALER2026', type: 'percent', value: 15, min_amount: 1000000, max_uses: 50, used_count: 21, expires_at: '2026-12-31T23:59:59', active: true, created_at: '2026-03-01' },
  { id: 'c-006', code: 'FIRSTBUY', type: 'fixed', value: 5000, min_amount: 300000, max_uses: 1000, used_count: 456, expires_at: null, active: true, created_at: '2026-01-01' },
];

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(DEMO_COUPONS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'fixed' as CouponType, value: '', min_amount: '', max_uses: '', expires_at: '' });

  function toggle(id: string) {
    setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  }

  function remove(id: string) {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  function add() {
    if (!form.code || !form.value) return;
    const newCoupon: Coupon = {
      id: `c-${Date.now()}`,
      code: form.code.toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_amount: form.min_amount ? Number(form.min_amount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      used_count: 0,
      expires_at: form.expires_at || null,
      active: true,
      created_at: new Date().toISOString().split('T')[0],
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    setForm({ code: '', type: 'fixed', value: '', min_amount: '', max_uses: '', expires_at: '' });
    setShowForm(false);
  }

  const activeCoupons = coupons.filter((c) => {
    if (!c.active) return false;
    if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
    if (c.max_uses != null && c.used_count >= c.max_uses) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black">クーポン管理</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-3">
            {[
              { label: '総数', val: coupons.length, cls: 'text-navy-700 bg-navy-50' },
              { label: '有効', val: activeCoupons.length, cls: 'text-emerald-700 bg-emerald-50' },
              { label: '総使用回数', val: coupons.reduce((s, c) => s + c.used_count, 0), cls: 'text-accent-700 bg-accent-50' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-2 text-center ${s.cls}`}>
                <p className="text-xl font-black">{s.val.toLocaleString()}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
          >
            <Plus className="h-4 w-4" /> 新規作成
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-dashed border-navy-200">
          <h2 className="mb-4 font-bold flex items-center gap-2">
            <Gift className="h-4 w-4 text-navy-500" /> 新規クーポン作成
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label text-xs">クーポンコード *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input uppercase text-sm" placeholder="SUMMER10" />
            </div>
            <div>
              <label className="label text-xs">タイプ *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })} className="input text-sm">
                <option value="fixed">固定額割引（円）</option>
                <option value="percent">パーセント割引（%）</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">割引額・率 *</label>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} min={1} className="input text-sm" placeholder="1000" />
            </div>
            <div>
              <label className="label text-xs">最低購入額（円）</label>
              <input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} min={0} className="input text-sm" placeholder="無制限の場合は空欄" />
            </div>
            <div>
              <label className="label text-xs">最大使用回数</label>
              <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} min={1} className="input text-sm" placeholder="無制限の場合は空欄" />
            </div>
            <div>
              <label className="label text-xs">有効期限</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="input text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={add} className="btn-accent">作成する</button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">キャンセル</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['コード', 'タイプ', '割引', '最低額', '使用状況', '有効期限', '状態', '操作'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => {
                const isExpired = c.expires_at != null && new Date(c.expires_at) < new Date();
                const isMaxed = c.max_uses != null && c.used_count >= c.max_uses;
                const isValid = c.active && !isExpired && !isMaxed;
                const usagePct = c.max_uses ? Math.round((c.used_count / c.max_uses) * 100) : null;
                return (
                  <tr key={c.id} className={!isValid ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-black font-mono tracking-wider text-navy-700">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.type === 'fixed' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {c.type === 'fixed' ? '固定額' : 'パーセント'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-accent-700">
                      {c.type === 'fixed' ? `¥${c.value.toLocaleString()}` : `${c.value}%`}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.min_amount ? `¥${c.min_amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{c.used_count.toLocaleString()}</span>
                        {c.max_uses != null && (
                          <>
                            <span className="text-slate-400">/ {c.max_uses.toLocaleString()}</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${usagePct! >= 90 ? 'bg-red-500' : usagePct! >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, usagePct!)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('ja-JP') : '無期限'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isValid ? 'bg-emerald-100 text-emerald-700' :
                        isExpired ? 'bg-slate-100 text-slate-500' :
                        isMaxed ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {!c.active ? '無効' : isExpired ? '期限切れ' : isMaxed ? '上限達成' : '有効'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggle(c.id)} className="text-slate-400 hover:text-navy-600" title={c.active ? '無効化' : '有効化'}>
                          {c.active
                            ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                            : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-red-500" title="削除">
                          <Trash2 className="h-4 w-4" />
                        </button>
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
