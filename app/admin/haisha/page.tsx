import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { Recycle, Inbox, Phone, User } from 'lucide-react';
import { formatYen } from '@/lib/format';
import {
  DISP_CLASSES, OWNER_LABELS, RUN_LABELS, MISSING_LABELS, requiredHaishaDocs,
} from '@/lib/haisha';
import { updateHaishaStatus, toggleHaishaFlag, saveHaishaMemo } from './actions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  maker: string | null; model: string | null; year: number | null; body: string | null; color: string | null;
  pref: string | null; side: string | null; disp_idx: number | null; mileage: string | null;
  run_state: string | null; key_state: string | null; shaken_months: number | null; repaired: boolean | null; missing: string[] | null;
  owner_type: string | null; matsu_type: string | null;
  base_price: number | null; offer_price: number | null; refund_total: number | null; needs_assessment: boolean | null;
  contact_name: string | null; contact_phone: string | null; contact_email: string | null; preferred_date: string | null; notes: string | null;
  status: string; paid: boolean; erased: boolean; refunded: boolean; admin_memo: string | null;
  user_id: string | null; created_at: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '受付', cls: 'bg-gold-100 text-gold-600' },
  assessing: { label: '査定中', cls: 'bg-navy-50 text-navy-700' },
  arranged: { label: '成約・引取手配', cls: 'bg-mint-100 text-mint-700' },
  picked_up: { label: '引取完了', cls: 'bg-mint-100 text-mint-700' },
  paid: { label: '入金済', cls: 'bg-emerald-50 text-emerald-700' },
  erased: { label: '抹消完了', cls: 'bg-emerald-50 text-emerald-700' },
  refunded: { label: '還付完了', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-slate-100 text-slate-500' },
};
const STATUS_ORDER = ['pending', 'assessing', 'arranged', 'picked_up', 'paid', 'erased', 'refunded', 'cancelled'];

export default async function AdminHaishaPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status: filter } = await searchParams;

  let rows: Row[] = [];
  let tableMissing = false;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('haisha_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) tableMissing = true;
    rows = (data ?? []) as Row[];
  } catch {
    tableMissing = true;
  }

  const shown = filter ? rows.filter((r) => r.status === filter) : rows;
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const kpis: [string, number][] = [
    ['受付', count('pending')],
    ['査定中', count('assessing')],
    ['引取手配', count('arranged') + count('picked_up')],
    ['入金待ち', rows.filter((r) => ['arranged', 'picked_up'].includes(r.status) && !r.paid).length],
    ['抹消未完', rows.filter((r) => !r.erased && r.status !== 'cancelled').length],
    ['還付処理中', rows.filter((r) => r.paid && !r.refunded).length],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Recycle className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">廃車買取</h1>
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">haisha_requests テーブルが見つからないか未適用です。</p>
          <p className="mt-1">Supabase SQL エディタで <code>supabase/migrations/20240761_haisha_requests.sql</code> を実行してください。</p>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {kpis.map(([l, n]) => (
          <div key={l} className="card p-3 text-center">
            <div className="text-xl font-black text-navy-700 tabular-nums">{n}</div>
            <div className="text-[11px] font-bold text-slate-500">{l}</div>
          </div>
        ))}
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-2">
        <FilterChip label="すべて" href="/admin/haisha" active={!filter} />
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} label={`${STATUS[s].label}（${count(s)}）`} href={`/admin/haisha?status=${s}`} active={filter === s} />
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">該当する廃車買取のお申し込みはありません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            const docs = requiredHaishaDocs(r.owner_type ?? undefined);
            return (
              <details key={r.id} className="card overflow-hidden p-0">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
                  <span className="font-black text-slate-800">{r.maker} {r.model}</span>
                  {r.owner_type === 'lien' && <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">所有権</span>}
                  {r.owner_type === 'deceased' && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">相続</span>}
                  {r.needs_assessment && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">要別途査定</span>}
                  <span className="ml-auto text-xs text-slate-400">{new Date(r.created_at).toLocaleString('ja-JP')}</span>
                  <div className="flex w-full flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 tabular-nums">
                    <span>{r.pref}{r.side ? ` ${r.side}` : ''}</span>
                    <span>{r.disp_idx != null ? DISP_CLASSES[r.disp_idx] : '-'}</span>
                    <span>{r.year}年 / {r.mileage}</span>
                    <span>提示 <b className="text-accent-600">{r.offer_price != null ? formatYen(r.offer_price) : '別途'}</b></span>
                    <span>還付 <b className="text-gold-600">{formatYen(r.refund_total ?? 0)}</b></span>
                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{r.contact_name}</span>
                  </div>
                </summary>

                <div className="space-y-4 border-t border-slate-100 p-4">
                  {/* 顧客・車両 */}
                  <div className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                    <KV k="お客様" v={r.contact_name} />
                    <KV k="電話" v={<a href={`tel:${r.contact_phone}`} className="inline-flex items-center gap-1 text-navy-700 hover:underline"><Phone className="h-3.5 w-3.5" />{r.contact_phone}</a>} />
                    {r.contact_email && <KV k="メール" v={r.contact_email} />}
                    {r.preferred_date && <KV k="希望引取日" v={r.preferred_date} />}
                    <KV k="車両" v={`${r.maker ?? ''} ${r.model ?? ''}（${r.year ?? '-'}年 / ${r.color ?? '-'}）`} />
                    <KV k="エリア / 排気量" v={`${r.pref ?? ''}${r.side ? ` ${r.side}` : ''} / ${r.disp_idx != null ? DISP_CLASSES[r.disp_idx] : '-'}`} />
                    <KV k="走行 / 車検残" v={`${r.mileage ?? '-'} / ${r.shaken_months ?? 0}ヶ月`} />
                    <KV k="状態" v={`${RUN_LABELS[r.run_state ?? ''] ?? '-'}${r.repaired ? ' / 修復歴あり' : ''}${r.key_state === 'nokey' ? ' / 鍵なし' : ''}`} />
                    <KV k="欠品" v={(r.missing && r.missing.length) ? r.missing.map((m) => MISSING_LABELS[m] ?? m).join('・') : 'なし'} />
                    <KV k="名義 / 抹消" v={`${OWNER_LABELS[r.owner_type ?? ''] ?? '-'} / ${r.matsu_type === 'eikyu' ? '永久抹消' : '一時抹消'}`} />
                  </div>

                  {/* 金額 */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-navy-200 p-3 text-sm">
                      <p className="mb-1 font-bold text-navy-700">価格</p>
                      <div className="flex justify-between"><span className="text-slate-500">基準額</span><span className="tabular-nums">{r.base_price != null ? formatYen(r.base_price) : '対象外'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">提示買取額</span><span className="font-black text-accent-600 tabular-nums">{r.offer_price != null ? formatYen(r.offer_price) : '別途見積'}</span></div>
                    </div>
                    <div className="rounded-xl border border-gold-200 p-3 text-sm">
                      <p className="mb-1 font-bold text-gold-600">還付金（別枠）</p>
                      <div className="flex justify-between"><span className="text-slate-500">合計（概算）</span><span className="font-black text-gold-600 tabular-nums">{formatYen(r.refund_total ?? 0)}</span></div>
                    </div>
                  </div>

                  {/* 必要書類 */}
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-1 text-sm font-bold text-navy-700">必要書類（{OWNER_LABELS[r.owner_type ?? ''] ?? '-'}）</p>
                    <div className="flex flex-wrap gap-1.5">
                      {docs.map((d, i) => (
                        <span key={i} className={`rounded px-2 py-0.5 text-[11px] ${d.required ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>{d.label}</span>
                      ))}
                    </div>
                  </div>

                  {r.notes && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-600">備考: {r.notes}</p>}

                  {/* 操作 */}
                  <div className="flex flex-wrap items-end gap-3">
                    <form action={updateHaishaStatus} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <div>
                        <label className="label">ステータス</label>
                        <select name="status" defaultValue={r.status} className="input py-2">
                          {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS[st].label}</option>)}
                        </select>
                      </div>
                      <button className="btn-primary px-4 py-2 text-sm">更新</button>
                    </form>

                    <div className="flex gap-2">
                      <FlagButton id={r.id} field="paid" on={r.paid} label="入金" />
                      <FlagButton id={r.id} field="erased" on={r.erased} label="抹消" />
                      <FlagButton id={r.id} field="refunded" on={r.refunded} label="還付" />
                    </div>
                  </div>

                  <form action={saveHaishaMemo} className="space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="label">運営メモ（相続・所有権解除・別途請求など）</label>
                    <textarea name="admin_memo" rows={2} defaultValue={r.admin_memo ?? ''} className="input" placeholder="例：信販へ所有権解除依頼中。相続代行¥22,000予定。" />
                    <button className="btn bg-navy-50 px-4 py-2 text-sm font-bold text-navy-700">メモを保存</button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a href={href} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${active ? 'border-navy-700 bg-navy-700 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
      {label}
    </a>
  );
}
function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-slate-50 py-1"><span className="text-slate-400">{k}</span><span className="text-right font-medium text-slate-700">{v}</span></div>;
}
function FlagButton({ id, field, on, label }: { id: string; field: string; on: boolean; label: string }) {
  return (
    <form action={toggleHaishaFlag}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={(!on).toString()} />
      <button className={`rounded-lg px-3 py-2 text-sm font-bold ${on ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {on ? '✓ ' : ''}{label}
      </button>
    </form>
  );
}
