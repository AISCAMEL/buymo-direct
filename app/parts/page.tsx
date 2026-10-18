import Link from 'next/link';
import { Gavel, Plus, Clock, Tag, Car, Search, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import {
  PART_CATEGORY_LABEL,
  CONDITION_LABEL,
  CAR_MAKERS,
  timeLeftLabel,
  type PartAuction,
  type PartCategory,
} from '@/lib/part-auction';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'パーツオークション（ヤフオク形式）| BUYMO ダイレクト',
  description: 'アルミホイール・タイヤ・カーナビ・エアロなどのカーパーツをオークション形式で出品・入札。適合車種で絞り込み、代理入札・即決にも対応。',
};

const CATS: (PartCategory | 'all')[] = ['all', 'wheel', 'tire', 'nav', 'aero', 'audio', 'exterior', 'interior', 'other'];

const SORTS = [
  { key: 'ending', label: '終了が近い順' },
  { key: 'popular', label: '人気順（入札数）' },
  { key: 'new', label: '新着順' },
  { key: 'price_desc', label: '価格が高い順' },
  { key: 'price_asc', label: '価格が安い順' },
];

export default async function PartsPage({ searchParams }: { searchParams: Promise<{ cat?: string; maker?: string; q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const cat = sp.cat && CATS.includes(sp.cat as PartCategory) ? (sp.cat as PartCategory) : 'all';
  const maker = sp.maker && (CAR_MAKERS as readonly string[]).includes(sp.maker) ? sp.maker : '';
  const keyword = (sp.q ?? '').replace(/[%,]/g, '').trim().slice(0, 40);
  const sort = SORTS.some((s) => s.key === sp.sort) ? sp.sort! : 'ending';

  const supabase = await createClient();
  let rows: PartAuction[] = [];
  let tableMissing = false;
  try {
    let q = supabase
      .from('part_auctions')
      .select('*')
      .eq('status', 'active')
      .limit(60);
    if (sort === 'popular') q = q.order('bid_count', { ascending: false }).order('ends_at', { ascending: true });
    else if (sort === 'new') q = q.order('created_at', { ascending: false });
    else if (sort === 'price_desc') q = q.order('current_price', { ascending: false });
    else if (sort === 'price_asc') q = q.order('current_price', { ascending: true });
    else q = q.order('ends_at', { ascending: true });
    if (cat !== 'all') q = q.eq('category', cat);
    if (maker) q = q.eq('fit_maker', maker);
    if (keyword) q = q.or(`title.ilike.%${keyword}%,fit_model.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    const { data, error } = await q;
    if (error) tableMissing = true;
    rows = (data ?? []) as PartAuction[];
  } catch {
    tableMissing = true;
  }

  const fitLabel = (a: PartAuction) => {
    const parts: string[] = [];
    if (a.fit_maker) parts.push(a.fit_maker);
    if (a.fit_model) parts.push(a.fit_model);
    return parts.join(' ');
  };

  const makeHref = (over: Partial<{ cat: string; maker: string; q: string; sort: string }>) => {
    const p = new URLSearchParams();
    const c = over.cat ?? (cat === 'all' ? '' : cat);
    const m = over.maker ?? maker;
    const k = over.q ?? keyword;
    const s2 = over.sort ?? (sort === 'ending' ? '' : sort);
    if (c) p.set('cat', c);
    if (m) p.set('maker', m);
    if (k) p.set('q', k);
    if (s2) p.set('sort', s2);
    const s = p.toString();
    return s ? `/parts?${s}` : '/parts';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="h-7 w-7 text-navy-500" />
          <div>
            <h1 className="text-2xl font-black">パーツオークション</h1>
            <p className="text-sm text-slate-500">代理入札・自動延長・適合車種検索つき。即決にも対応（買取保証はありません）。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/parts/watching" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Heart className="h-4 w-4" /> ウォッチ中</Link>
          <Link href="/parts/new" className="btn-accent"><Plus className="h-4 w-4" /> パーツを出品する</Link>
        </div>
      </div>

      {/* 適合車種で絞り込み */}
      <form action="/parts" method="get" className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        {cat !== 'all' && <input type="hidden" name="cat" value={cat} />}
        <div className="flex-1">
          <label className="label flex items-center gap-1"><Car className="h-3.5 w-3.5" /> メーカー</label>
          <select name="maker" defaultValue={maker} className="input">
            <option value="">すべて</option>
            {CAR_MAKERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-[2]">
          <label className="label flex items-center gap-1"><Search className="h-3.5 w-3.5" /> キーワード・車種</label>
          <input name="q" defaultValue={keyword} className="input" placeholder="例）プリウス 30系 / 17インチ / ETC" />
        </div>
        <button className="btn-accent sm:w-auto"><Search className="h-4 w-4" /> 検索</button>
        {(maker || keyword) && (
          <Link href={cat === 'all' ? '/parts' : `/parts?cat=${cat}`} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-bold text-slate-500 hover:bg-slate-50">クリア</Link>
        )}
      </form>

      {/* カテゴリ */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Link
            key={c}
            href={makeHref({ cat: c === 'all' ? '' : c })}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${cat === c ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {c === 'all' ? 'すべて' : PART_CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      {/* 並び替え */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400">並び替え:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={makeHref({ sort: s.key === 'ending' ? '' : s.key })}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${sort === s.key ? 'bg-accent-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">part_auctions テーブルが未適用です。</p>
          <p className="mt-1 break-words [&_code]:break-all">Supabase で <code>supabase/migrations/20240769_part_auctions.sql</code> と <code>20240771_part_auction_pro.sql</code> を実行してください。</p>
        </div>
      )}

      {rows.length === 0 && !tableMissing ? (
        <p className="card p-12 text-center text-sm text-slate-500">
          {maker || keyword ? '条件に合う出品が見つかりませんでした。条件を変えてお試しください。' : '現在開催中の出品はありません。「パーツを出品する」から始めましょう。'}
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
                {fitLabel(a) && (
                  <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-navy-500"><Car className="h-3 w-3 shrink-0" />{fitLabel(a)}</p>
                )}
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
