'use client';

import { useState } from 'react';
import { Tag, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatYen } from '@/lib/format';
import type { Coupon } from '@/lib/types';

export function CouponInput({
  totalAmount,
  onApply,
}: {
  totalAmount: number;
  onApply: (discount: number, couponId: string) => void;
}) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<Coupon | null>(null);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle();

    setLoading(false);

    if (!data) { setError('このクーポンコードは無効です'); return; }
    const c = data as Coupon;
    if (c.expires_at && new Date(c.expires_at) < new Date()) { setError('このクーポンは期限切れです'); return; }
    if (c.max_uses != null && c.used_count >= c.max_uses) { setError('このクーポンは使用済みです'); return; }
    if (totalAmount < c.min_amount) { setError(`このクーポンは¥${c.min_amount.toLocaleString()}以上の取引が対象です`); return; }

    const disc = c.type === 'fixed'
      ? Math.min(c.value, totalAmount)
      : Math.round((totalAmount * c.value) / 100);

    setApplied(c);
    setDiscount(disc);
    onApply(disc, c.id);
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        クーポン「{applied.code}」適用中 — {formatYen(discount)} 割引
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="input pl-9 uppercase tracking-wider"
            placeholder="クーポンコード"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), apply())}
          />
        </div>
        <button type="button" onClick={apply} disabled={loading || !code.trim()} className="btn-outline shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '適用'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
