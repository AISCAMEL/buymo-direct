import { ArrowRight } from 'lucide-react';
import { StarRating } from '@/components/StarRating';
import { WORK_CASE_CATEGORY_CLS, type WorkCase } from '@/lib/work-cases';

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

/** 作業事例カード（ビフォーアフター＋料金・所要時間・お客様の声）。 */
export function WorkCaseCard({ c }: { c: WorkCase }) {
  return (
    <article className="card overflow-hidden p-0">
      {/* ビフォーアフター */}
      <div className="relative grid grid-cols-2">
        {c.category && (
          <span className={`absolute right-2 top-2 z-10 rounded-full px-2.5 py-0.5 text-[11px] font-black ${WORK_CASE_CATEGORY_CLS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{c.category}</span>
        )}
        <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100 text-3xl">
          <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-black text-white">施工前</span>
          {c.before_url ? <img src={c.before_url} alt="施工前" className="h-full w-full object-cover" /> : '🚗'}
        </div>
        <div className="relative flex aspect-[4/3] items-center justify-center bg-emerald-50 text-3xl">
          <span className="absolute left-2 top-2 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">施工後</span>
          {c.after_url ? <img src={c.after_url} alt="施工後" className="h-full w-full object-cover" /> : '✨'}
        </div>
        <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-accent-600 shadow">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      <div className="space-y-2.5 p-4">
        <h3 className="font-black text-navy-800">{c.title}</h3>
        {c.description && <p className="text-sm leading-relaxed text-slate-600">{c.description}</p>}
        <div className="flex flex-wrap gap-1.5">
          {c.price != null && <span className="rounded-md bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700">料金 <b className="text-sm tabular-nums">{yen(c.price)}</b></span>}
          {c.duration && <span className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">所要 {c.duration}</span>}
          {c.car_name && <span className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">{c.car_name}</span>}
        </div>

        {(c.customer_voice || c.customer_name) && (
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">🙂</span>
              <span className="text-xs font-bold text-slate-700">{c.customer_name ?? 'お客様'}</span>
              {c.rating != null && <span className="ml-auto"><StarRating value={c.rating} /></span>}
            </div>
            {c.customer_voice && <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{c.customer_voice}</p>}
          </div>
        )}

        {c.work_date && <p className="text-[11px] text-slate-400">{new Date(c.work_date).toLocaleDateString('ja-JP')} 実施</p>}
      </div>
    </article>
  );
}
