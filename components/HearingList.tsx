import { Phone, Car } from 'lucide-react';
import type { HearingSheet } from '@/lib/hearing';

export function HearingList({ sheets }: { sheets: HearingSheet[] }) {
  if (sheets.length === 0) {
    return <div className="card p-8 text-center text-sm text-slate-400">まだヒアリングはありません。店舗QR／ヒアリングフォームから届くとここに表示されます。</div>;
  }
  return (
    <div className="space-y-2">
      {sheets.map((s) => {
        const h = s.hearing ?? {};
        const comps = (h.competitors ?? []).filter((c) => c.name || c.price);
        return (
          <div key={s.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-black text-navy-800">{s.customer_name || '（お名前なし）'}</span>
              {s.tel && <span className="inline-flex items-center gap-1 text-sm text-slate-500"><Phone className="h-3.5 w-3.5" />{s.tel}</span>}
              <span className="ml-auto text-xs text-slate-400">{new Date(s.created_at).toLocaleString('ja-JP')}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              <Car className="mr-1 inline h-4 w-4 text-slate-400" />
              {[s.maker, s.model].filter(Boolean).join(' ') || '車両未入力'}
              {s.model_year ? ` / ${s.model_year}年` : ''}{s.mileage_km != null ? ` / ${s.mileage_km.toLocaleString()}km` : ''}
              {s.store_label ? `　［${s.store_label}］` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {h.hopePrice && <span>希望 ¥{h.hopePrice}</span>}
              {h.sellTiming && <span>時期：{h.sellTiming}</span>}
              {!!(h.motives && h.motives.length) && <span>理由：{h.motives.join('・')}</span>}
              {comps.length > 0 && <span className="font-bold text-coral-600">他社：{comps.map((c) => `${c.name || '他社'} ¥${c.price || '?'}`).join('／')}</span>}
            </div>
            {h.situation && <p className="mt-1 text-xs text-slate-500">状況：{h.situation}</p>}
            {h.conditionNote && <p className="mt-1 text-xs text-slate-500">状態：{h.conditionNote}</p>}
            {h.requests && <p className="mt-1 text-xs text-slate-500">要望：{h.requests}</p>}
          </div>
        );
      })}
    </div>
  );
}
