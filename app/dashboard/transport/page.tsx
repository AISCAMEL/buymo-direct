import { redirect } from 'next/navigation';
import { Truck, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PREFECTURES } from '@/lib/constants';
import { bookTransport } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '陸送手配 | BUYMO' };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '受付中', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '確認済み', cls: 'bg-blue-100 text-blue-700' },
  in_transit: { label: '輸送中', cls: 'bg-purple-100 text-purple-700' },
  delivered: { label: '配送完了', cls: 'bg-emerald-100 text-emerald-700' },
};

// 簡易距離・料金テーブル（実際は距離APIで計算）
const BASE_PRICE = 30000;
const ZONE_EXTRA: Record<string, number> = {
  '北海道': 35000, '沖縄県': 40000, '鹿児島県': 20000,
  '青森県': 18000, '岩手県': 16000, '秋田県': 17000,
};

export default async function TransportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/transport');

  const { data: bookings } = await (supabase as any)
    .from('transport_bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-2">
        <Truck className="h-6 w-6 text-navy-400" />
        <h1 className="text-2xl font-black">陸送手配</h1>
      </div>

      {/* Price guide */}
      <div className="card p-5">
        <h2 className="mb-3 font-bold">料金の目安</h2>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            { route: '東京→大阪', price: '¥45,000〜' },
            { route: '東京→福岡', price: '¥68,000〜' },
            { route: '大阪→名古屋', price: '¥32,000〜' },
            { route: '東京→仙台', price: '¥38,000〜' },
          ].map(({ route, price }) => (
            <div key={route} className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-400">{route}</p>
              <p className="font-black text-navy-700">{price}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">※ 上記はバイク・小型車（〜3m）の目安です。大型車・SUVは別途お見積もり。北海道・沖縄は追加料金あり。</p>
      </div>

      {/* Booking form */}
      <form action={bookTransport} className="card p-5 space-y-4">
        <h2 className="font-bold">陸送を手配する</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold">出発地（都道府県）</label>
            <select name="from_prefecture" required className="input w-full">
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">到着地（都道府県）</label>
            <select name="to_prefecture" required className="input w-full">
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">希望日（任意）</label>
            <input name="preferred_date" type="date" className="input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">車両情報（任意）</label>
            <input name="vehicle_info" className="input w-full" placeholder="例: トヨタ プリウス 2022年" />
          </div>
        </div>
        <button type="submit" className="btn-accent flex items-center gap-2">
          <MapPin className="h-4 w-4" /> 陸送を依頼する
        </button>
        <p className="text-xs text-slate-400">ご依頼後、担当者より1営業日以内に確認のご連絡をいたします。</p>
      </form>

      {/* Past bookings */}
      {(bookings ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold">過去の依頼</h2>
          {(bookings ?? []).map((b: any) => {
            const s = STATUS[b.status] ?? STATUS.pending;
            return (
              <div key={b.id} className="card p-4 flex items-start gap-4">
                <Truck className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
                <div className="flex-1">
                  <p className="font-bold">{b.from_prefecture} → {b.to_prefecture}</p>
                  {b.vehicle_info && <p className="text-sm text-slate-500">{b.vehicle_info}</p>}
                  {b.preferred_date && <p className="text-xs text-slate-400">希望日: {b.preferred_date}</p>}
                  <p className="text-xs text-slate-400">申請日: {b.created_at?.slice(0, 10)}</p>
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
