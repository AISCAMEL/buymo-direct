import Link from 'next/link';
import { Gavel, Plus, Clock, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import {
  PART_CATEGORY_LABEL,
  CONDITION_LABEL,
  timeLeftLabel,
  type PartAuction,
  type PartCategory,
} from '@/lib/part-auction';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'パーツオークション（ヤフオク形式）| BUYMO ダイレクト',
  description: 'アルミホイール・タイヤ・カーナビ・エアロなどのカーパーツをオークション形式で出品・入札。即決にも対応。',
};

const CATS: (PartCategory | 'all')[] = ['all', 'wheel', 'tire', 'nav', 'aero', 'audio', 'exterior', 'interior', 'other'];

export default async function PartsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  const cat = sp.cat && CATS.includes(sp.cat as PartCategory) ? (sp.cat as PartCategory) : 'all';

  const supabase = await createClient();
  let rows: PartAuction[] = [];
  let tableMissing = false;
  try {
    let q = supabase
      .from('part_auctions')
      .select('*')
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
      .limit(60);
    if (cat !== 'all') q = q.eq('category', cat);
    const { data, error } = await q;
    if (error) tableMissing = true;
    rows = (data ?? []) as PartAuction[];
  } catch {
    tableMissing = true;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="h-7 w-7 text-navy-500" />
          <div>
            <h1 className="text-2xl font-black">パーツオークション</h1>
            <p className="text-sm text-slate-500">ヤフオク形式で出品・入札。即決にも対応（買取保証はありません）。</p>
          </div>
        </div>
        <Link href="/parts/new" className="btn-accent"><Plus className="h-4 w-4" /> パーツを出品する</Link>
      </div>

      {/* カテゴリ */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Link
            key={c}
            href={c === 'all' ? '/parts' : `/parts?cat=${c}`}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${cat === c ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {c === 'all' ? 'すべて' : PART_CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">part_auctions テーブルが未適用です。</p>
          <p className="mt-1">Supabase で <code>supabase/migrations/20240769_part_auctions.sql</code> を実行してください。</p>
        </div>
      )}

      {rows.length === 0 && !tableMissing ? (
        <p className="card p-12 text-center text-sm text-slate-500">
          現在開催中の出品はありません。「パーツを出品する」から始めましょう。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((a) => (
            <Link key={a.id} href={`/parts/${a.id}`} className="card group overflow-hidden p-0 transition hover:shadow-md">
              <div className="relative aspect-square bg-slate-100">
                {a.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.images[0]} alt={a.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300"><Tag className="h-10 w-10" /></div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {PART_CATEGORY_LABEL[a.category]} / {CONDITION_LABEL[a.item_condition]}
                </span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-navy-800">{a.title}</p>
                <div className="mt-1.5 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">現在価格</p>
                    <p className="text-lg font-black text-accent-600 tabular-nums">{formatYen(a.current_price)}</p>
                  </div>
                  <p className="text-[10px] text-slate-400">入札 {a.bid_count}件</p>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Clock className="h-3 w-3" /> {timeLeftLabel(a.ends_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
