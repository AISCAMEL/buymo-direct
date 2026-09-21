import { redirect } from 'next/navigation';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { PREFECTURES } from '@/lib/constants';
import { CATALOG_MAKERS } from '@/lib/vehicle-catalog';
import { requestAppraisal } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '無料車両査定 | BUYMO' };

const MAKERS = CATALOG_MAKERS;
const CONDITIONS = [
  { value: 'excellent', label: '極上（無傷・無修復）' },
  { value: 'good', label: '良好（小傷あり）' },
  { value: 'fair', label: '普通（修復歴なし）' },
  { value: 'poor', label: '難あり（修復歴・不具合あり）' },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '申請受付中', cls: 'bg-amber-100 text-amber-700' },
  in_review: { label: '査定中', cls: 'bg-navy-100 text-navy-700' },
  completed: { label: '査定完了', cls: 'bg-emerald-100 text-emerald-700' },
};

export default async function AppraisalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/appraisal');

  const { data: requests } = await (supabase as any)
    .from('appraisal_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const currentYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-navy-400" />
        <h1 className="text-2xl font-black">無料車両査定</h1>
      </div>

      {/* How it works */}
      <div className="card p-5">
        <h2 className="mb-4 font-bold text-slate-700">査定の流れ</h2>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {[
            { step: '1', label: '情報入力', desc: '車両情報・状態を入力' },
            { step: '2', label: 'AI査定', desc: '相場データで自動算出' },
            { step: '3', label: '結果通知', desc: '最短当日メールでお知らせ' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="space-y-1">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-navy-600 text-sm font-black text-white">{step}</div>
              <p className="font-bold">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Request form */}
      <form action={requestAppraisal} className="card p-5 space-y-4">
        <h2 className="font-bold">査定を依頼する</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold">メーカー</label>
            <select name="maker" required className="input w-full">
              {MAKERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">車種名</label>
            <input name="model" required className="input w-full" placeholder="例: プリウス" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">年式</label>
            <input name="year" type="number" required min="1990" max={currentYear} className="input w-full" placeholder={String(currentYear - 3)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">走行距離（km）</label>
            <input name="mileage_km" type="number" required min="0" className="input w-full" placeholder="例: 35000" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">所在地（都道府県）</label>
            <select name="prefecture" required className="input w-full">
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">車両の状態</label>
            <select name="condition" className="input w-full">
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">備考・特記事項（任意）</label>
          <textarea name="notes" rows={2} className="input w-full" placeholder="オプション装備、気になる箇所など" />
        </div>
        <button type="submit" className="btn-accent">無料で査定を依頼する</button>
        <p className="text-xs text-slate-400">査定結果は登録メールアドレスに最短当日中にお送りします。費用は一切かかりません。</p>
      </form>

      {/* Past requests */}
      {(requests ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold">過去の査定依頼</h2>
          {(requests ?? []).map((r: any) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            return (
              <div key={r.id} className="card p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-bold">{r.maker} {r.model} {r.year}年</p>
                  <p className="text-sm text-slate-500">{r.mileage_km.toLocaleString()}km / {r.prefecture}</p>
                  <p className="text-xs text-slate-400">申請日: {r.created_at?.slice(0, 10)}</p>
                  {r.status === 'completed' && r.price_low && r.price_high && (
                    <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="font-black text-emerald-700">
                          推定価格: {formatYen(r.price_low)} 〜 {formatYen(r.price_high)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
