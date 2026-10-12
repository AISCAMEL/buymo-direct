import Link from 'next/link';
import { MapPin, Package, Home, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { skillCategory } from '@/lib/matching-fee';
import { skillLabel } from '@/lib/cases';
import { StarRating } from '@/components/StarRating';
import { normalizeStyle, deriveStyle, isMobile, isShop, type ServiceStyle } from '@/lib/service-style';

export const dynamic = 'force-dynamic';
export const metadata = { title: '加盟店一覧 | BUYMO' };

export default async function DealersPage({
  searchParams,
}: {
  searchParams: Promise<{ prefecture?: string; skill?: string; category?: string; style?: string }>;
}) {
  const { prefecture, skill, category, style } = await searchParams;
  const styleFilter: ServiceStyle | null = style === 'mobile' || style === 'shop' ? style : null;
  const supabase = await createClient();
  const s = supabase as any;

  // スキルマスタ（絞り込みチップ用）
  const { data: skillMaster } = await s.from('skills').select('key, name, category, sort').order('sort', { ascending: true });
  const allSkills = (skillMaster ?? []) as { key: string; name: string; category: string | null; sort: number }[];
  const categories = Array.from(new Set(allSkills.map((sk) => sk.category).filter(Boolean))) as string[];

  // 絞り込み対象のスキルキー（個別スキル優先、なければ選択ジャンル内の全スキル）
  let targetSkillKeys: string[] | null = null;
  if (skill) targetSkillKeys = [skill];
  else if (category) targetSkillKeys = allSkills.filter((sk) => sk.category === category).map((sk) => sk.key);

  // 該当スキルを提供する加盟店IDを取得
  let skillDealerIds: string[] | null = null;
  if (targetSkillKeys) {
    const { data: ps } = await s
      .from('partner_skills')
      .select('dealer_id')
      .in('skill_key', targetSkillKeys.length ? targetSkillKeys : ['__none__'])
      .eq('active', true);
    skillDealerIds = Array.from(new Set((ps ?? []).map((r: any) => r.dealer_id)));
  }

  const chipCls = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-bold ${on ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;
  const prefQ = (extra: Record<string, string>) => {
    const qp = new URLSearchParams();
    if (prefecture) qp.set('prefecture', prefecture);
    for (const [k, v] of Object.entries(extra)) qp.set(k, v);
    const str = qp.toString();
    return str ? `/dealers?${str}` : '/dealers';
  };

  const baseCols = 'id, owner_id, name, company_name, prefecture, description, logo_url, rep_name, rep_photo_url, rep_message, service_area, tagline, cover_url, gallery';
  const runDealers = (cols: string) => {
    let q = s.from('dealers').select(cols).eq('status', 'approved').order('name', { ascending: true });
    if (prefecture) q = q.eq('prefecture', prefecture);
    if (skillDealerIds) q = q.in('id', skillDealerIds.length ? skillDealerIds : ['00000000-0000-0000-0000-000000000000']);
    return q;
  };
  // service_style カラムが未導入でも動くよう、失敗したら列なしで再取得
  let { data: dealers, error: dealersErr } = await runDealers(`${baseCols}, service_style`);
  const hasStyleCol = !dealersErr;
  if (dealersErr) ({ data: dealers } = await runDealers(baseCols));

  // 各プロの営業形態（カラムがあればその値、無ければテキストから推定）
  const styleOf = (d: any): ServiceStyle =>
    hasStyleCol ? normalizeStyle(d.service_style) : deriveStyle(d.service_area, d.description, d.tagline);

  // listing counts per dealer
  const { data: counts } = await s
    .from('listings')
    .select('dealer_id')
    .eq('status', 'active')
    .in('dealer_id', (dealers ?? []).map((d: any) => d.id));

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.dealer_id] = (countMap[row.dealer_id] ?? 0) + 1;
  }

  // 各加盟店の提供サービス（ジャンル）バッジ＋最低料金
  const { data: dealerSkillRows } = await s
    .from('partner_skills')
    .select('dealer_id, skill_key, price_from')
    .eq('active', true)
    .in('dealer_id', (dealers ?? []).map((d: any) => d.id));
  const catMap: Record<string, string[]> = {};
  const skillNameMap: Record<string, string[]> = {};
  const priceFromMap: Record<string, number> = {};
  for (const row of (dealerSkillRows ?? []) as { dealer_id: string; skill_key: string; price_from: number | null }[]) {
    const c = skillCategory(row.skill_key);
    const arr = (catMap[row.dealer_id] ??= []);
    if (!arr.includes(c)) arr.push(c);
    const names = (skillNameMap[row.dealer_id] ??= []);
    const label = skillLabel(row.skill_key);
    if (!names.includes(label)) names.push(label);
    if (row.price_from != null && row.price_from > 0) {
      priceFromMap[row.dealer_id] = priceFromMap[row.dealer_id] != null
        ? Math.min(priceFromMap[row.dealer_id], row.price_from)
        : row.price_from;
    }
  }

  // 口コミ（レビュー）集計：reviewee_id = 加盟店オーナーのプロフィールID
  const ownerIds = Array.from(new Set((dealers ?? []).map((d: any) => d.owner_id).filter(Boolean)));
  const { data: reviewRows } = ownerIds.length
    ? await s.from('reviews').select('reviewee_id, rating').in('reviewee_id', ownerIds)
    : { data: [] };
  const ratingAgg: Record<string, { sum: number; count: number }> = {};
  for (const r of (reviewRows ?? []) as { reviewee_id: string; rating: number }[]) {
    const a = (ratingAgg[r.reviewee_id] ??= { sum: 0, count: 0 });
    a.sum += r.rating;
    a.count += 1;
  }

  // prefecture options
  const prefectureList = Array.from(new Set((dealers ?? []).map((d: any) => d.prefecture).filter(Boolean))) as string[];

  // くらしのマーケット風：評価・口コミ数で人気順に並べ替え（営業形態で絞り込み）
  const ranked = [...((dealers ?? []) as any[])]
    .filter((d) => {
      if (!styleFilter) return true;
      const st = styleOf(d);
      return styleFilter === 'mobile' ? isMobile(st) : isShop(st);
    })
    .sort((a, b) => {
    const ra = ratingAgg[a.owner_id];
    const rb = ratingAgg[b.owner_id];
    const ca = ra?.count ?? 0, cb = rb?.count ?? 0;
    const aa = ra ? ra.sum / ra.count : 0, ab = rb ? rb.sum / rb.count : 0;
    if (cb !== ca) return cb - ca;           // 口コミが多い順
    if (ab !== aa) return ab - aa;           // 次に高評価順
    return (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0); // 在庫数
  });
  const noFilter = !category && !skill && !prefecture;

  // カテゴリの絵文字アイコン（くらしのマーケット風タイル用）
  const catEmoji = (c: string): string => {
    if (/整備|車検|点検|オイル/.test(c)) return '🔧';
    if (/板金|塗装|キズ|へこみ|修理/.test(c)) return '🎨';
    if (/コーティング|洗車|美装|クリーニング|磨き/.test(c)) return '✨';
    if (/電装|ナビ|取付|ドラレコ|オーディオ/.test(c)) return '🔌';
    if (/査定|買取|販売|仕入/.test(c)) return '💰';
    if (/陸送|輸送|配送|運搬|引取/.test(c)) return '🚚';
    if (/タイヤ|ホイール/.test(c)) return '🛞';
    if (/ガラス/.test(c)) return '🪟';
    if (/鍵|キー|スマートキー/.test(c)) return '🔑';
    if (/保険/.test(c)) return '📄';
    if (/行政|名義|登録|車庫/.test(c)) return '📝';
    if (/レンタ|カーシェア/.test(c)) return '🚗';
    if (/解体|廃車|リサイクル/.test(c)) return '♻️';
    if (/ロード|レッカー|出張|バッテリー/.test(c)) return '🆘';
    return '🚘';
  };
  const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

  // 営業形態タブのリンク（他の絞り込みは維持）
  const styleHref = (st: 'shop' | 'mobile' | null) => {
    const qp = new URLSearchParams();
    if (category) qp.set('category', category);
    if (skill) qp.set('skill', skill);
    if (prefecture) qp.set('prefecture', prefecture);
    if (st) qp.set('style', st);
    const str = qp.toString();
    return str ? `/dealers?${str}` : '/dealers';
  };
  const styleTabCls = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition ${on ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;

  return (
    <div className="space-y-6">
      {/* ヒーロー */}
      <section className="rounded-3xl bg-gradient-to-br from-navy-700 to-navy-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-black sm:text-3xl">車のプロに、直接たのむ。</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-100">
          整備・板金・コーティング・査定・陸送まで。顔の見えるプロを、<strong className="text-white">口コミ・料金・実績</strong>で選んで、そのまま相談・依頼できます。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-navy-100">
          <span>✓ 明朗料金・事前見積り</span>
          <span>✓ 口コミで安心</span>
          <span>✓ エスクローで安全決済</span>
        </div>
      </section>

      {/* カテゴリアイコンタイル（くらしのマーケット風） */}
      <div>
        <p className="mb-2 text-sm font-black text-slate-700">カテゴリから探す</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          <a href={prefQ({})} className={`flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition ${noFilter || (!category && !skill) ? 'border-accent-400 bg-accent-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <span className="text-2xl">🚘</span>
            <span className="text-[11px] font-bold leading-tight text-slate-600">すべて</span>
          </a>
          {categories.map((c) => (
            <a key={c} href={prefQ({ category: c })} className={`flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition ${category === c ? 'border-accent-400 bg-accent-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <span className="text-2xl">{catEmoji(c)}</span>
              <span className="line-clamp-2 text-[11px] font-bold leading-tight text-slate-600">{c}</span>
            </a>
          ))}
        </div>
      </div>

      {/* 詳細サービス（選択ジャンル内） */}
      {(category || skill) && (
        <div className="flex flex-wrap gap-2">
          {allSkills
            .filter((sk) => !category || sk.category === category)
            .map((sk) => (
              <a key={sk.key} href={prefQ({ skill: sk.key })} className={chipCls(skill === sk.key)}>{sk.name}</a>
            ))}
        </div>
      )}

      {/* エリア絞り込み */}
      {prefectureList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400">エリア</span>
          <a href={prefQ({})} className={`rounded-full border px-3 py-1 text-xs font-bold ${!prefecture ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>全国</a>
          {prefectureList.map((p) => {
            const qp = new URLSearchParams();
            if (category) qp.set('category', category);
            if (skill) qp.set('skill', skill);
            qp.set('prefecture', p);
            return (
              <a key={p} href={`/dealers?${qp.toString()}`} className={`rounded-full border px-3 py-1 text-xs font-bold ${prefecture === p ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{p}</a>
            );
          })}
        </div>
      )}

      {/* 営業形態タブ（店舗型／出張型） */}
      <div className="flex flex-wrap gap-2">
        <a href={styleHref(null)} className={styleTabCls(!styleFilter)}>すべて</a>
        <a href={styleHref('shop')} className={styleTabCls(styleFilter === 'shop')}><Home className="h-4 w-4" />店舗型</a>
        <a href={styleHref('mobile')} className={styleTabCls(styleFilter === 'mobile')}><Car className="h-4 w-4" />出張型</a>
      </div>

      {styleFilter === 'mobile' && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
          🚗 自宅・職場までプロが出張。お店に行かなくても、その場で対応してもらえます。
        </p>
      )}

      <div className="flex items-baseline justify-between">
        <p className="text-sm font-black text-slate-700">{ranked.length}人のプロ<span className="ml-1 text-xs font-normal text-slate-400">（人気順）</span></p>
        <Link href="/skills" className="text-xs font-bold text-accent-600 hover:underline">サービス一覧から探す →</Link>
      </div>

      {ranked.length === 0 && (
        <p className="py-16 text-center text-slate-400">条件に合うプロが見つかりませんでした。</p>
      )}

      {/* プロカード（くらしのマーケット風） */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((d: any, i: number) => {
          const face = d.rep_photo_url || null;
          const cover = d.cover_url || (Array.isArray(d.gallery) && d.gallery[0]) || d.logo_url || null;
          const intro = d.tagline || d.rep_message || d.description || null;
          const skills = (skillNameMap[d.id] ?? []) as string[];
          const agg = ratingAgg[d.owner_id];
          const avg = agg ? agg.sum / agg.count : 0;
          const price = priceFromMap[d.id];
          const topRank = noFilter && i < 3 ? i + 1 : 0;
          const highRated = agg && agg.count >= 3 && avg >= 4.5;
          const st = styleOf(d);
          const mobile = isMobile(st);
          const styleBadge = st === 'both' ? '出張＋店舗' : st === 'mobile' ? '出張OK' : '店舗';
          return (
            <Link key={d.id} href={`/dealers/${d.id}`} className="group card overflow-hidden p-0 transition hover:shadow-lg">
              {/* カバー画像 */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-navy-100 to-slate-100">
                {cover ? (
                  <img src={cover} alt={d.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">🚘</div>
                )}
                {/* バッジ */}
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-black shadow ${mobile ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700'}`}>
                    {mobile ? <Car className="h-3 w-3" /> : <Home className="h-3 w-3" />}{styleBadge}
                  </span>
                  {topRank > 0 && (
                    <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-black text-navy-900 shadow">人気 No.{topRank}</span>
                  )}
                  {highRated && (
                    <span className="rounded-full bg-navy-600 px-2 py-0.5 text-[11px] font-black text-white shadow">高評価</span>
                  )}
                </div>
                {(d.service_area || d.prefecture) && (
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
                    <MapPin className="h-3 w-3" />{d.service_area || d.prefecture}
                  </span>
                )}
                {/* 顔写真（重ねる） */}
                {face && (
                  <img src={face} alt={d.rep_name || d.name} className="absolute -bottom-5 left-4 h-14 w-14 rounded-full border-4 border-white object-cover shadow" />
                )}
              </div>

              <div className={`space-y-2 p-4 ${face ? 'pt-7' : ''}`}>
                <div>
                  <h2 className="truncate font-black text-navy-800">{d.name}</h2>
                  {d.rep_name && <p className="truncate text-xs text-slate-500">担当：{d.rep_name}</p>}
                </div>

                {/* 評価 */}
                {agg ? (
                  <StarRating value={avg} count={agg.count} />
                ) : (
                  <span className="text-[11px] font-bold text-slate-300">口コミはこれから</span>
                )}

                {/* 料金 */}
                {price != null && (
                  <p className="text-sm text-slate-500">
                    料金 <span className="text-lg font-black tabular-nums text-accent-600">{yen(price)}</span><span className="font-bold text-accent-600">〜</span>
                  </p>
                )}

                {/* 出張対応（セイビー型） */}
                {mobile && (
                  <p className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Car className="h-3.5 w-3.5 shrink-0" />自宅・職場まで出張{d.service_area ? `（${d.service_area}）` : ''}
                  </p>
                )}

                {/* 自己紹介 */}
                {intro && <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{intro}</p>}

                {/* できること */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {skills.slice(0, 4).map((name) => (
                      <span key={name} className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-600">{name}</span>
                    ))}
                    {skills.length > 4 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">+{skills.length - 4}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />在庫 {countMap[d.id] ?? 0}台</span>
                  <span className="font-bold text-accent-600 group-hover:underline">詳しく見る →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
