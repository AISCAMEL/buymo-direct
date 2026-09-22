import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { Truck, Inbox, Phone, Mail, User } from 'lucide-react';
import { formatYen } from '@/lib/format';
import { CAR_SIZES } from '@/lib/transport';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  from_pref: string | null;
  to_pref: string | null;
  car_size: string | null;
  est_low: number | null;
  est_high: number | null;
  preferred_date: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '受付中', cls: 'bg-gold-100 text-gold-600' },
  arranged: { label: '手配済み', cls: 'bg-navy-50 text-navy-700' },
  completed: { label: '完了', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-slate-100 text-slate-500' },
};

function sizeLabel(v: string | null): string {
  return CAR_SIZES.find((s) => s.value === v)?.label ?? v ?? '-';
}

export default async function AdminTransportPage() {
  await requireAdmin();

  let rows: Row[] = [];
  let tableMissing = false;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('transport_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) tableMissing = true;
    rows = (data ?? []) as Row[];
  } catch {
    tableMissing = true;
  }

  const pending = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Truck className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">陸送申込</h1>
        {pending > 0 && <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-black text-gold-600">未処理 {pending} 件</span>}
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">transport_requests テーブルが見つからないか未適用です。</p>
          <p className="mt-1">Supabase SQL エディタで <code>supabase/migrations/20240727_transport_requests.sql</code> を実行してください。</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">陸送のお申し込みはまだありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            return (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
                  <span className="font-black text-slate-800">{r.from_pref} → {r.to_pref}</span>
                  <span className="text-sm text-slate-500">{sizeLabel(r.car_size)}</span>
                  {r.est_low && r.est_high && (
                    <span className="text-xs text-slate-500">概算 {formatYen(r.est_low)}〜{formatYen(r.est_high)}</span>
                  )}
                  {r.preferred_date && <span className="text-xs text-slate-500">希望集荷: {r.preferred_date}</span>}
                  <span className="ml-auto text-xs text-slate-400">{new Date(r.created_at).toLocaleString('ja-JP')}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  {r.contact_name && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" />{r.contact_name}</span>}
                  {r.contact_phone && <a href={`tel:${r.contact_phone}`} className="inline-flex items-center gap-1 text-navy-700 hover:underline"><Phone className="h-3.5 w-3.5" />{r.contact_phone}</a>}
                  {r.contact_email && <a href={`mailto:${r.contact_email}`} className="inline-flex items-center gap-1 text-accent-600 hover:underline"><Mail className="h-3.5 w-3.5" />{r.contact_email}</a>}
                  {r.user_id && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-600">会員</span>}
                </div>
                {r.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">備考: {r.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
