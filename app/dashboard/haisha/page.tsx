import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Recycle, Inbox, CheckCircle2, Circle, FileText, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { DISP_CLASSES, OWNER_LABELS, requiredHaishaDocs } from '@/lib/haisha';

export const dynamic = 'force-dynamic';
export const metadata = { title: '廃車買取の申込状況 | BUYMO' };

type Row = {
  id: string;
  maker: string | null; model: string | null; year: number | null;
  pref: string | null; side: string | null; disp_idx: number | null; mileage: string | null;
  owner_type: string | null;
  base_price: number | null; offer_price: number | null; refund_total: number | null; needs_assessment: boolean | null;
  status: string; paid: boolean; erased: boolean; refunded: boolean;
  created_at: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '受付（確認中）', cls: 'bg-amber-100 text-amber-700' },
  assessing: { label: '査定中', cls: 'bg-navy-100 text-navy-700' },
  arranged: { label: '成約・引取手配', cls: 'bg-accent-50 text-accent-600' },
  picked_up: { label: '引取完了', cls: 'bg-accent-50 text-accent-600' },
  paid: { label: '入金済', cls: 'bg-emerald-100 text-emerald-700' },
  erased: { label: '抹消完了', cls: 'bg-emerald-100 text-emerald-700' },
  refunded: { label: '還付完了', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-slate-100 text-slate-500' },
};

export default async function DashboardHaishaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/haisha');

  let rows: Row[] = [];
  let tableMissing = false;
  const { data, error } = await supabase
    .from('haisha_requests')
    .select('id, maker, model, year, pref, side, disp_idx, mileage, owner_type, base_price, offer_price, refund_total, needs_assessment, status, paid, erased, refunded, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) tableMissing = true;
  rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Recycle className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black">廃車買取の申込状況</h1>
        </div>
        <Link href="/haisha" className="btn-gold flex items-center gap-1 text-sm">
          新しく見積る <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {tableMissing ? (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">まだご利用いただけません。</p>
          <p className="mt-1">廃車買取の受付準備が整い次第、こちらに申込状況が表示されます。</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">廃車買取のお申し込みはまだありません。</p>
          <Link href="/haisha" className="btn-gold text-sm">その場提示で買取額を見る</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            const docs = requiredHaishaDocs(r.owner_type ?? undefined);
            const steps: [string, boolean][] = [
              ['成約・引取', ['arranged', 'picked_up', 'paid', 'erased', 'refunded'].includes(r.status)],
              ['入金', r.paid],
              ['抹消', r.erased],
              ['還付', r.refunded],
            ];
            return (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
                  <span className="font-black text-slate-800">{r.maker} {r.model}</span>
                  {r.needs_assessment && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">別途査定</span>}
                  <span className="ml-auto text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('ja-JP')}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 tabular-nums">
                  <span>{r.pref}{r.side ? ` ${r.side}` : ''}</span>
                  <span>{r.disp_idx != null ? DISP_CLASSES[r.disp_idx] : '-'}</span>
                  <span>{r.year}年 / {r.mileage}</span>
                </div>

                {/* 金額 */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-navy-200 p-3 text-sm">
                    <p className="text-xs text-slate-500">その場提示 買取額</p>
                    <p className="text-xl font-black text-accent-600 tabular-nums">{r.offer_price != null ? formatYen(r.offer_price) : '別途見積'}</p>
                  </div>
                  <div className="rounded-xl border border-gold-200 p-3 text-sm">
                    <p className="text-xs text-slate-500">還付金（別枠・概算）</p>
                    <p className="text-xl font-black text-gold-600 tabular-nums">{formatYen(r.refund_total ?? 0)}</p>
                  </div>
                </div>

                {/* 進捗 */}
                <div className="mt-3 flex flex-wrap gap-3">
                  {steps.map(([label, done]) => (
                    <span key={label} className={`inline-flex items-center gap-1 text-xs font-bold ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}{label}
                    </span>
                  ))}
                </div>

                {/* 必要書類 */}
                <details className="mt-3">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-navy-700">
                    <FileText className="h-4 w-4" /> 必要書類（{OWNER_LABELS[r.owner_type ?? ''] ?? '-'}）
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {docs.map((d, i) => (
                      <span key={i} className={`rounded px-2 py-0.5 text-[11px] ${d.required ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                        {d.label}{d.required ? '' : '（条件付）'}
                      </span>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">
        ※ 表示金額は申込時点の概算です。車両確認後に最終金額を確定し、担当よりご連絡します。還付金は買取金とは別にお戻しします。
      </p>
    </div>
  );
}
