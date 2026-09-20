// 車両査定ロジック（サーバー側）。
// まず裏側で査定し、ANTHROPIC_API_KEY があればAI査定、無ければ相場計算式にフォールバックする。
import { generateWithClaude } from '@/lib/ai';
import { createServiceClient } from '@/lib/supabase/service';

export type ValuationInput = {
  maker: string;
  model?: string;
  year: number;
  mileageKm: number;
  condition: string;
};

export type ValuationResult = {
  lower: number;
  upper: number;
  est: number;
  source: 'ai' | 'formula';
  reasoning?: string;
};

const MAKER_BASE_PRICE: Record<string, number> = {
  レクサス: 5_500_000, 輸入車: 4_200_000, トヨタ: 2_800_000, ホンダ: 2_400_000,
  日産: 2_200_000, マツダ: 2_200_000, スバル: 2_300_000, 三菱: 2_000_000,
  スズキ: 1_300_000, ダイハツ: 1_200_000, その他: 2_000_000,
};

/** 相場計算式（AI未使用時のフォールバック）。 */
export function estimateByFormula(input: ValuationInput): { lower: number; upper: number; est: number } {
  const { maker, year, mileageKm, condition } = input;
  const base = MAKER_BASE_PRICE[maker] ?? 2_000_000;
  const age = Math.max(0, new Date().getFullYear() - year);

  // 年次減価
  let residual = 1.0;
  for (let i = 0; i < age; i++) {
    const rate = i < 3 ? 0.18 : i < 6 ? 0.12 : 0.08;
    residual *= 1 - rate;
  }

  // 走行距離係数（15000km/年を基準）
  const stdMileage = age * 15000;
  const excessKm = Math.max(0, mileageKm - stdMileage);
  const mileageFactor = Math.max(0.4, 1 - excessKm * 0.000008);

  // コンディション係数
  const condFactor = ({ excellent: 1.15, good: 1.0, fair: 0.82 } as Record<string, number>)[condition] ?? 1.0;

  const est = base * residual * mileageFactor * condFactor;
  const lower = Math.round((est * 0.85) / 10000) * 10000;
  const upper = Math.round((est * 1.15) / 10000) * 10000;

  return { lower: Math.max(50_000, lower), upper: Math.max(100_000, upper), est: Math.round(est) };
}

/** 査定（AI優先・フォールバックで計算式）。サーバー専用。 */
export async function valuate(input: ValuationInput): Promise<ValuationResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const prompt = `以下の中古車の適正な査定価格帯を提案してください。必ずJSON形式のみで返答してください。

メーカー: ${input.maker}
${input.model ? `モデル: ${input.model}\n` : ''}年式: ${input.year}年
走行距離: ${Number(input.mileageKm).toLocaleString('ja-JP')}km
コンディション: ${input.condition}

以下のJSON形式のみで返答してください（説明文・前置き・コードブロック記号は不要）:
{"price_low": 数値, "price_high": 数値, "reasoning": "査定理由（日本語100字以内）"}

price_lowとprice_highは円単位の整数です。`;

      const text = await generateWithClaude(prompt);
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { price_low?: unknown; price_high?: unknown; reasoning?: unknown };
        const low = Number(parsed.price_low);
        const high = Number(parsed.price_high);
        if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low) {
          return {
            lower: Math.round(low),
            upper: Math.round(high),
            est: Math.round((low + high) / 2),
            source: 'ai',
            reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
          };
        }
      }
    } catch {
      /* AI失敗時は計算式にフォールバック */
    }
  }

  const f = estimateByFormula(input);
  return { ...f, source: 'formula' };
}

/** 査定履歴を保存（service role・ベストエフォート）。テーブル未作成/失敗時も例外を投げない。 */
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
      reasoning: result.reasoning ?? null,
      user_id: userId,
    });
  } catch (err) {
    console.error('[valuation] 履歴保存に失敗:', err instanceof Error ? err.message : err);
  }
}
