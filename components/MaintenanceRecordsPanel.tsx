'use client';

import { useState, useTransition } from 'react';
import { Wrench, Plus, Trash2, Paperclip, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/format';
import type { MaintenanceRecord } from '@/lib/types';

export function MaintenanceRecordsPanel({
  listingId,
  records: initial,
  isOwner,
}: {
  listingId: string;
  records: MaintenanceRecord[];
  isOwner: boolean;
}) {
  const [records, setRecords] = useState<MaintenanceRecord[]>(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', performed_at: '', mileage_km: '', cost: '', note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  async function addRecord(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      let attachmentUrl: string | null = null;

      if (file) {
        const path = `${listingId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('maintenance-docs').upload(path, file, { upsert: true });
        if (!error) {
          const { data: pub } = supabase.storage.from('maintenance-docs').getPublicUrl(path);
          attachmentUrl = pub.publicUrl;
        }
      }

      const { data, error } = await supabase.from('maintenance_records').insert({
        listing_id: listingId,
        title: form.title,
        performed_at: form.performed_at,
        mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
        cost: form.cost ? Number(form.cost) : null,
        note: form.note || null,
        attachment_url: attachmentUrl,
      }).select('*').single();

      if (!error && data) {
        setRecords((prev) => [...prev, data as MaintenanceRecord]);
        setForm({ title: '', performed_at: '', mileage_km: '', cost: '', note: '' });
        setFile(null);
        setAdding(false);
      }
    });
  }

  function deleteRecord(id: string) {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from('maintenance_records').delete().eq('id', id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold">
          <Wrench className="h-4 w-4 text-navy-500" /> 整備記録（{records.length}件）
        </h3>
        {isOwner && !adding && (
          <button onClick={() => setAdding(true)} className="btn-outline flex items-center gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> 追加
          </button>
        )}
      </div>

      {records.length === 0 && !adding && (
        <p className="text-sm text-slate-400">{isOwner ? '整備記録を追加して信頼性をアピールしましょう。' : '整備記録はまだありません。'}</p>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2 text-left">日付</th>
                <th className="pb-2 text-left">内容</th>
                <th className="pb-2 text-right">km</th>
                <th className="pb-2 text-right">費用</th>
                <th className="pb-2 text-center">添付</th>
                {isOwner && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{formatDate(r.performed_at)}</td>
                  <td className="py-2 pr-3 font-bold">
                    {r.title}
                    {r.note && <p className="text-xs font-normal text-slate-400">{r.note}</p>}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-500">
                    {r.mileage_km != null ? r.mileage_km.toLocaleString() : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-500">
                    {r.cost != null ? `¥${r.cost.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2 text-center">
                    {r.attachment_url && (
                      <a href={r.attachment_url} target="_blank" rel="noopener noreferrer" className="text-navy-400 hover:text-navy-600">
                        <Paperclip className="h-4 w-4 inline" />
                      </a>
                    )}
                  </td>
                  {isOwner && (
                    <td className="py-2 pl-2">
                      <button onClick={() => deleteRecord(r.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <form onSubmit={addRecord} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label text-xs">作業内容 *</label>
              <input required className="input text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="エンジンオイル交換" />
            </div>
            <div>
              <label className="label text-xs">実施日 *</label>
              <input required type="date" className="input text-sm" value={form.performed_at} onChange={(e) => setForm({ ...form, performed_at: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">走行距離(km)</label>
              <input type="number" min={0} className="input text-sm" value={form.mileage_km} onChange={(e) => setForm({ ...form, mileage_km: e.target.value })} placeholder="50000" />
            </div>
            <div>
              <label className="label text-xs">費用(円)</label>
              <input type="number" min={0} className="input text-sm" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="5000" />
            </div>
          </div>
          <div>
            <label className="label text-xs">メモ</label>
            <input className="input text-sm" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="作業詳細・使用部品など" />
          </div>
          <div>
            <label className="label text-xs">添付ファイル（領収書・記録簿など）</label>
            <input type="file" accept="image/*,application/pdf" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-accent text-sm">
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              保存
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn-outline text-sm">キャンセル</button>
          </div>
        </form>
      )}
    </div>
  );
}
