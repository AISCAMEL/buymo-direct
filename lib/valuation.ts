// 車両査定ロジック（サーバー側・高機能版）。
// 1) 実出品データ（同条件の現役出品）で相場を裏付け、2) 計算式で価格要因を分解、
// 3) ANTHROPIC_API_KEY があればAIでレンジ・コメント・売り方を精緻化。
import { generateWithClaude } from '@/lib/ai';
import { createServiceClient } from '@/lib/supabase/service';

export type ValuationInput = {
  maker: string;
  model?: string;
  year: number;
  mileageKm: number;
  condition: string;
  /** 車検: 'valid'=あり(有効) / 'none'=なし・切れ */
  shaken?: 'valid' | 'none';
  /** 事故歴: 'none'=なし / 'repaired'=修復歴あり */
  accident?: 'none' | 'repaired';
  /** 追加情報（精度向上・任意） */
  grade?: string;
  color?: string;
  options?: string[];
  region?: string;
};

export type ValuationFactor = { label: string; impact: number; note?: string };
export type HistogramBucket = { label: string; count: number };
export type TrendPoint = { label: string; value: number };

/** 装備オプションの加点（ダイレクト販売相場への寄与・円）。 */
export const OPTION_VALUES: Record<string, number> = {
  'カーナビ': 80_000,
  'サンルーフ': 120_000,
  '本革シート': 150_000,
  'ETC': 20_000,
  'ドライブレコーダー': 30_000,
  'アルミホイール': 50_000,
  'バックカメラ': 40_000,
  '4WD': 100_000,
  '両側パワースライド': 80_000,
  '衝突被害軽減ブレーキ': 60_000,
};
export const OPTION_KEYS = Object.keys(OPTION_VALUES);
const POPULAR_COLORS = ['ホワイト', 'ブラック'];

export type ValuationResult = {
  // 買取目安
  lower: number;
  upper: number;
  est: number;
  // ダイレクト販売目安（買取より高め）
  retailLower: number;
  retailUpper: number;
  retailEst: number;
  source: 'ai' | 'formula';
  reasoning?: string;
  marketComment?: string;
  confidence: 'high' | 'medium' | 'low';
  sampleCount: number;
  recommend: 'direct' | 'buyback' | 'either';
  factors: ValuationFactor[];
  histogram: HistogramBucket[];
  trend: TrendPoint[];
};

const MAKER_BASE_PRICE: Record<string, number> = {
  レクサス: 5_500_000, 輸入車: 4_200_000, トヨタ: 2_800_000, ホンダ: 2_400_000,
  日産: 2_200_000, マツダ: 2_200_000, スバル: 2_300_000, 三菱: 2_000_000,
  スズキ: 1_300_000, ダイハツ: 1_200_000, その他: 2_000_000,
};

const roundMan = (n: number) => Math.round(n / 10000) * 10000;
const BUYBACK_RATIO = 0.83; // ダイレクト販売相場に対する買取目安の比率

/** 計算式による相場推定＋価格要因の内訳（ダイレクト販売相場ベース）。 */
export function estimateByFormula(input: ValuationInput): { retailEst: number; factors: ValuationFactor[] } {
  const { maker, year, mileageKm, condition } = input;
  const base = MAKER_BASE_PRICE[maker] ?? 2_000_000;
  const age = Math.max(0, new Date().getFullYear() - year);

  // 年次減価
  let residual = 1.0;
  for (let i = 0; i < age; i++) {
    const rate = i < 3 ? 0.18 : i < 6 ? 0.12 : 0.08;
    residual *= 1 - rate;
  }
  const core = base * residual; // 年式反映後の素価

  // 走行距離係数（15000km/年を基準）
  const stdMileage = age * 15000;
  const excessKm = Math.max(0, mileageKm - stdMileage);
  const mileageFactor = Math.max(0.4, 1 - excessKm * 0.000008);

  const condFactor = ({ excellent: 1.15, good: 1.0, fair: 0.82 } as Record<string, number>)[condition] ?? 1.0;
  const shakenFactor = input.shaken === 'valid' ? 1.03 : input.shaken === 'none' ? 0.96 : 1.0;
  const accidentFactor = input.accident === 'repaired' ? 0.7 : 1.0;

  const colorFactor = input.color && POPULAR_COLORS.includes(input.color) ? 1.03 : 1.0;
  const opts = (input.options ?? []).filter((o) => OPTION_VALUES[o]);
  const optionsBonus = opts.reduce((s, o) => s + (OPTION_VALUES[o] ?? 0), 0);

  const s1 = core * mileageFactor;
  const s2 = s1 * condFactor;
  const s3 = s2 * shakenFactor;
  const s4 = s3 * accidentFactor;
  const s5 = s4 * colorFactor;
  const retailEst = Math.max(50_000, Math.round(s5 + optionsBonus));

  const factors: ValuationFactor[] = [
    { label: `年式（${age}年落ち）`, impact: roundMan(core - base), note: `新車相当 ${roundMan(base) / 10000}万円 から減価` },
    { label: '走行距離', impact: roundMan(s1 - core), note: `${Number(mileageKm).toLocaleString('ja-JP')}km（基準 ${stdMileage.toLocaleString('ja-JP')}km）` },
    { label: 'コンディション', impact: roundMan(s2 - s1), note: condition === 'excellent' ? '優良' : condition === 'fair' ? '普通' : '良好' },
    { label: '車検', impact: roundMan(s3 - s2), note: input.shaken === 'valid' ? 'あり（有効）' : input.shaken === 'none' ? 'なし・切れ' : '不明' },
    { label: '事故・修復歴', impact: roundMan(s4 - s3), note: input.accident === 'repaired' ? '修復歴あり' : 'なし' },
    { label: '人気カラー', impact: roundMan(s5 - s4), note: input.color ?? '—' },
    { label: '装備オプション', impact: roundMan(optionsBonus), note: opts.length ? opts.join('・') : 'なし' },
  ].filter((f) => f.impact !== 0 || f.label.startsWith('年式') || f.label === '走行距離');

  return { retailEst, factors };
}

/** 価格配列から相場分布ヒストグラム（5区間）を作る。 */
function buildHistogram(prices: number[]): HistogramBucket[] {
  if (prices.length < 4) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max <= min) return [];
  const bins = 5;
  const width = (max - min) / bins;
  const buckets: HistogramBucket[] = Array.from({ length: bins }, (_, i) => {
    const lo = min + width * i;
    const hi = i === bins - 1 ? max : min + width * (i + 1);
    return { label: `${Math.round(lo / 10000)}〜${Math.round(hi / 10000)}万`, count: 0 };
  });
  for (const p of prices) {
    let idx = Math.floor((p - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    buckets[idx].count++;
  }
  return buckets;
}

/** 同条件の現役出品から相場を集計（ダイレクト販売＝掲載価格ベース）＋分布。 */
async function gatherComparables(input: ValuationInput): Promise<{ count: number; median: number; low: number; high: number; histogram: HistogramBucket[] }> {
  try {
    const svc = createServiceClient();
    const pick = async (useModel: boolean, span: number) => {
      let q = svc.from('listings').select('price').eq('status', 'active').eq('maker', input.maker)
        .gte('year', input.year - span).lte('year', input.year + span);
      if (useModel && input.model) q = q.eq('model', input.model);
      const { data } = await q.limit(300);
      return (data ?? []).map((r: { price: number }) => r.price).filter((n) => Number.isFinite(n) && n > 0);
    };
    let prices = input.model ? await pick(true, 2) : [];
    if (prices.length < 3) prices = await pick(false, 3); // モデル一致が少なければメーカー＋年式幅で補完
    if (prices.length === 0) return { count: 0, median: 0, low: 0, high: 0, histogram: [] };
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { count: prices.length, median, low: sorted[0], high: sorted[sorted.length - 1], histogram: buildHistogram(prices) };
  } catch {
    return { count: 0, median: 0, low: 0, high: 0, histogram: [] };
  }
}

/** 過去の査定履歴から相場トレンド（月次平均・直近6点）を作る。 */
async function getValuationTrend(input: ValuationInput): Promise<TrendPoint[]> {
  try {
    const svc = createServiceClient();
    const since = new Date(Date.now() - 300 * 86_400_000).toISOString();
    let q = svc.from('valuations').select('price_est, created_at').eq('maker', input.maker)
      .gte('created_at', since).order('created_at', { ascending: true }).limit(2000);
    if (input.model) q = q.eq('model', input.model);
    const { data } = await q;
    const rows = (data ?? []) as { price_est: number; created_at: string }[];
    if (rows.length < 6) return [];
    const byMonth = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      if (!Number.isFinite(r.price_est) || r.price_est <= 0) continue;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = byMonth.get(key) ?? { sum: 0, n: 0 };
      cur.sum += r.price_est; cur.n++; byMonth.set(key, cur);
    }
    const points = [...byMonth.entries()].map(([label, v]) => ({ label, value: Math.round(v.sum / v.n) }));
    return points.slice(-6);
  } catch {
    return [];
  }
}

function confidenceFromSample(n: number): 'high' | 'medium' | 'low' {
  return n >= 8 ? 'high' : n >= 3 ? 'medium' : 'low';
}

function recommendOf(input: ValuationInput): 'direct' | 'buyback' | 'either' {
  if (input.accident === 'repaired' || input.condition === 'fair') return 'buyback';
  if (input.condition === 'excellent' && input.shaken === 'valid') return 'direct';
  return 'either';
}

function buildResult(
  retailEst: number, factors: ValuationFactor[],
  comps: { count: number; median: number; histogram: HistogramBucket[] }, trend: TrendPoint[],
  source: 'ai' | 'formula', input: ValuationInput, reasoning?: string, marketComment?: string,
  recommend?: 'direct' | 'buyback' | 'either',
): ValuationResult {
  const retailLower = roundMan(retailEst * 0.9);
  const retailUpper = roundMan(retailEst * 1.1);
  const est = roundMan(retailEst * BUYBACK_RATIO);
  return {
    lower: Math.max(50_000, roundMan(est * 0.92)),
    upper: Math.max(100_000, roundMan(est * 1.08)),
    est,
    retailLower: Math.max(80_000, retailLower),
    retailUpper: Math.max(120_000, retailUpper),
    retailEst: Math.round(retailEst),
    source,
    reasoning,
    marketComment,
    confidence: confidenceFromSample(comps.count),
    sampleCount: comps.count,
    recommend: recommend ?? recommendOf(input),
    factors,
    histogram: comps.histogram,
    trend,
  };
}

/** 査定（実データ＋計算式＋AI）。サーバー専用。 */
export async function valuate(input: ValuationInput): Promise<ValuationResult> {
  const { retailEst: formulaRetail, factors } = estimateByFormula(input);
  const [comps, trend] = await Promise.all([gatherComparables(input), getValuationTrend(input)]);

  // 実出品の中央値があれば、計算式とブレンドして実勢に寄せる
  let retailEst = formulaRetail;
  if (comps.count >= 3) retailEst = Math.round(comps.median * 0.6 + formulaRetail * 0.4);
  else if (comps.count >= 1) retailEst = Math.round(comps.median * 0.35 + formulaRetail * 0.65);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const prompt = `あなたは日本の中古車相場に精通した査定士です。次の車両の「ダイレクト販売（個人がより高く売る想定）」の適正価格レンジを提案してください。

車両:
- メーカー: ${input.maker}${input.model ? ` / ${input.model}` : ''}
- 年式: ${input.year}年
- 走行距離: ${Number(input.mileageKm).toLocaleString('ja-JP')}km
- コンディション: ${input.condition}
- 車検: ${input.shaken === 'valid' ? 'あり（有効）' : input.shaken === 'none' ? 'なし・切れ' : '不明'}
- 事故歴: ${input.accident === 'repaired' ? '修復歴あり' : input.accident === 'none' ? 'なし' : '不明'}
${input.grade ? `- グレード: ${input.grade}\n` : ''}${input.color ? `- 色: ${input.color}\n` : ''}${input.options?.length ? `- 装備: ${input.options.join('・')}\n` : ''}${input.region ? `- 地域: ${input.region}\n` : ''}
参考データ:
- 計算式による販売相場: ${formulaRetail.toLocaleString('ja-JP')}円
- 同条件の現役出品 ${comps.count}件（中央値 ${comps.median ? comps.median.toLocaleString('ja-JP') + '円' : 'データ少'}）

次のJSONのみで返答（説明・コードブロック不要）:
{"retail_low": 数値, "retail_high": 数値, "reasoning": "査定の根拠(日本語90字以内)", "market_comment": "相場動向や売り時の一言(60字以内)", "recommend": "direct" または "buyback" または "either"}
retail_low/high は円単位の整数。実データがある場合はそれを重視してください。`;

      const text = await generateWithClaude(prompt, undefined, undefined, 500);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const p = JSON.parse(match[0]) as { retail_low?: unknown; retail_high?: unknown; reasoning?: unknown; market_comment?: unknown; recommend?: unknown };
        const low = Number(p.retail_low);
        const high = Number(p.retail_high);
        if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low) {
          const aiRetail = Math.round((low + high) / 2);
          const rec = (['direct', 'buyback', 'either'] as const).includes(p.recommend as 'direct')
            ? (p.recommend as 'direct' | 'buyback' | 'either') : undefined;
          return buildResult(
            aiRetail, factors, comps, trend, 'ai', input,
            typeof p.reasoning === 'string' ? p.reasoning : undefined,
            typeof p.market_comment === 'string' ? p.market_comment : undefined,
            rec,
          );
        }
      }
    } catch {
      /* AI失敗時はブレンド値にフォールバック */
    }
  }

  const comment = comps.count >= 3
    ? `同条件の出品${comps.count}件の実勢を反映した相場です。`
    : '出品データが少ないため、計算式ベースの参考値です。';
  return buildResult(retailEst, factors, comps, trend, 'formula', input, undefined, comment);
}

/** 査定履歴を保存（service role・ベストエフォート）。既存カラムのみ使用。 */
export async function logValuation(
  input: ValuationInput,
  result: ValuationResult,
  userId: string | null,
): Promise<void> {
  try {
    const service = createServiceClient();
    await service.from('valuations').insert({
      maker: input.maker,
      model: input.model ?? null,
      year: input.year,
      mileage_km: input.mileageKm,
      condition: input.condition,
      price_low: result.lower,
      price_high: result.upper,
      price_est: result.est,
      source: result.source,
      reasoning: result.reasoning ?? result.marketComment ?? null,
      user_id: userId,
    });
  } catch (err) {
    console.error('[valuation] 履歴保存に失敗:', err instanceof Error ? err.message : err);
  }
}
