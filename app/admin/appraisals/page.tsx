import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { ClipboardCheck, Inbox, Phone, Mail, User } from 'lucide-react';
import { formatYen } from '@/lib/format';
import { updateAppraisalQuote } from './actions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  prefecture: string;
  condition: string;
  notes: string | null;
  status: string;
  price_low: number | null;
  price_high: number | null;
  ai_price_low: number | null;
  ai_price_high: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  user_id: string | null;
  source: string | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '受付中', cls: 'bg-gold-100 text-gold-600' },
  in_review: { label: '査定中', cls: 'bg-navy-50 text-navy-700' },
  completed: { label: '査定完了', cls: 'bg-emerald-50 text-emerald-700' },
};
const COND: Record<string, string> = { excellent: '極上', good: '良好', fair: '普通', poor: '難あり' };

export default async function AdminAppraisalsPage() {
  await requireAdmin();

  let rows: Row[] = [];
  let tableMissing = false;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('appraisal_requests')
      .select('id, maker, model, year, mileage_km, prefecture, condition, notes, status, price_low, price_high, ai_price_low, ai_price_high, contact_name, contact_phone, contact_email, user_id, source, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) tableMissing = true;
    rows = (data ?? []) as Row[];
  } catch {
    tableMissing = true;
  }

  const pending = rows.filter((r) => r.status === 'pending' || r.status === 'in_review').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">査定依頼</h1>
        {pending > 0 && <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-black text-gold-600">未処理 {pending} 件</span>}
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">appraisal_requests テーブル（拡張）が見つからないか未適用です。</p>
          <p className="mt-1">Supabase SQL エディタで <code>supabase/migrations/20240723_appraisal_formal.sql</code> を実行してください。</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">査定依頼はまだありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            return (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
                  <span className="font-black text-slate-800">{r.maker} {r.model} <span className="font-normal text-slate-400">{r.year}年</span></span>
                  <span className="text-sm text-slate-500">{r.mileage_km.toLocaleString('ja-JP')}km / {r.prefecture} / {COND[r.condition] ?? r.condition}</span>
                  <span className="ml-auto text-xs text-slate-400">{new Date(r.created_at).toLocaleString('ja-JP')}</span>
                </div>

                {/* 連絡先 */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  {r.contact_name && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" />{r.contact_name}</span>}
                  {r.contact_phone && <a href={`tel:${r.contact_phone}`} className="inline-flex items-center gap-1 text-navy-700 hover:underline"><Phone className="h-3.5 w-3.5" />{r.contact_phone}</a>}
                  {r.contact_email && <a href={`mailto:${r.contact_email}`} className="inline-flex items-center gap-1 text-accent-600 hover:underline"><Mail className="h-3.5 w-3.5" />{r.contact_email}</a>}
                  {r.user_id && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-600">会員</span>}
                  {r.ai_price_low && r.ai_price_high && (
                    <span className="text-xs text-slate-500">AI概算: {formatYen(r.ai_price_low)}〜{formatYen(r.ai_price_high)}</span>
                  )}
                </div>
                {r.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">備考: {r.notes}</p>}

                {/* 確定金額の入力 */}
                <form action={updateAppraisalQuote} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <div>
                    <label className="block text-xs font-bold text-slate-500">確定額（下限）</label>
                    <input name="price_low" type="number" defaultValue={r.price_low ?? undefined} placeholder="例: 1200000" className="input h-9 w-36 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500">確定額（上限）</label>
                    <input name="price_high" type="number" defaultValue={r.price_high ?? undefined} placeholder="例: 1450000" className="input h-9 w-36 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500">状態</label>
                    <select name="status" defaultValue={r.status} className="input h-9 w-28 text-sm">
                      <option value="pending">受付中</option>
                      <option value="in_review">査定中</option>
                      <option value="completed">査定完了</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-accent h-9 px-4 text-sm">保存</button>
                  <span className="text-xs text-slate-400">※「査定完了」で保存すると、メール登録者へ確定額を自動送信します。</span>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
