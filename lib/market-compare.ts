// 市場価格くらべ：外部市場（大手中古車サイト・ディーラー認定中古など）の相場をAIが推定し、
// BUYMOの販売価格（自社出品の実データ）と並べて「BUYMOで買う方がお得」を比較表で示す。
// ※スクレイピングはせず、AIの相場推定＋自社出品の実統計で構成する。
import type { MarketStats } from '@/lib/market';

export type CompareVehicle = {
  maker: string;
  model?: string;
  year?: number;
  mileageKm?: number;
};

export type ChannelPrice = {
  channel: string; // 例：大手中古車サイト、ディーラー認定中古、オークション相当
  priceLow: number; // 万円ではなく円
  priceHigh: number;
  note?: string;
};

export type MarketCompareResult = {
  channels: ChannelPrice[];
  buymoLow: number | null;
  buymoHigh: number | null;
  buymoNote: string;
  savingText: string; // 「BUYMOなら市場より約〇万円おトク」等
  summary: string;
  fromInternal: boolean; // BUYMO価格が自社出品の実データ由来か
};

export const COMPARE_SYSTEM = [
  'あなたは日本の中古車市場に詳しいアナリストです。与えられた車両について、',
  '現在の日本国内での販売価格の相場観を、販路ごとに推定してください。',
  '推定は一般的な市場感に基づく概算で構いません（実在の個別広告は参照しないこと）。',
  '必ず次のJSONだけを返してください（前後に文章・コードフェンスを付けない）:',
  '{"channels":[{"channel":"大手中古車サイト(平均的な掲載価格)","low":円,"high":円,"note":"一言"},',
  '{"channel":"ディーラー認定中古","low":円,"high":円,"note":"一言"},',
  '{"channel":"オークション相当(業者仕入れの目安)","low":円,"high":円,"note":"一言"}],',
  '"buymoLow":円,"buymoHigh":円,"buymoNote":"BUYMO想定販売価格の根拠を一言",',
  '"summary":"この車のお得ポイントを1〜2文で"}',
  '金額は日本円の整数（例:1280000）。不明な車種でも、年式・走行距離から妥当な概算を出すこと。',
].join('\n');

export function buildComparePrompt(v: CompareVehicle, internal: MarketStats | null): string {
  const parts: string[] = [];
  parts.push('車両:');
  parts.push(`- メーカー: ${v.maker}`);
  if (v.model) parts.push(`- 車種: ${v.model}`);
  if (v.year) parts.push(`- 年式: ${v.year}年`);
  if (v.mileageKm != null) parts.push(`- 走行距離: ${v.mileageKm.toLocaleString()}km`);
  if (internal) {
    parts.push('');
    parts.push('参考（BUYMOの現在の同条件出品の実データ）:');
    parts.push(`- 出品数: ${internal.sample}件`);
    parts.push(`- 中央値: ¥${internal.medianPrice.toLocaleString()} / 平均: ¥${internal.avgPrice.toLocaleString()}`);
    parts.push(`- 価格帯: ¥${internal.minPrice.toLocaleString()}〜¥${internal.maxPrice.toLocaleString()}`);
    parts.push('BUYMOの想定販売価格(buymoLow/buymoHigh)は、この実データを優先して設定してください。');
  }
  parts.push('');
  parts.push('上記のJSONフォーマットだけで回答してください。');
  return parts.join('\n');
}

type RawChannel = { channel?: unknown; low?: unknown; high?: unknown; note?: unknown };
type RawParsed = {
  channels?: RawChannel[];
  buymoLow?: unknown;
  buymoHigh?: unknown;
  buymoNote?: unknown;
  summary?: unknown;
};

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** AI応答（JSON文字列）を安全にパースして結果に整える。 */
export function parseCompare(text: string, internal: MarketStats | null): MarketCompareResult | null {
  let raw: RawParsed | null = null;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    raw = m ? (JSON.parse(m[0]) as RawParsed) : null;
  } catch {
    raw = null;
  }
  if (!raw) return null;

  const channels: ChannelPrice[] = (raw.channels ?? [])
    .map((c) => {
      const low = toInt(c.low);
      const high = toInt(c.high);
      if (low == null || high == null) return null;
      return {
        channel: String(c.channel ?? '市場').slice(0, 40),
        priceLow: Math.min(low, high),
        priceHigh: Math.max(low, high),
        note: c.note ? String(c.note).slice(0, 80) : undefined,
      } as ChannelPrice;
    })
    .filter((x): x is ChannelPrice => x !== null)
    .slice(0, 5);

  // BUYMO価格：自社実データ優先（±で幅を作る）、無ければAI値
  let buymoLow: number | null = null;
  let buymoHigh: number | null = null;
  let fromInternal = false;
  if (internal) {
    buymoLow = internal.minPrice > 0 ? internal.minPrice : internal.medianPrice;
    buymoHigh = internal.medianPrice;
    if (buymoLow > buymoHigh) [buymoLow, buymoHigh] = [buymoHigh, buymoLow];
    fromInternal = true;
  } else {
    buymoLow = toInt(raw.buymoLow);
    buymoHigh = toInt(raw.buymoHigh);
    if (buymoLow != null && buymoHigh != null && buymoLow > buymoHigh) [buymoLow, buymoHigh] = [buymoHigh, buymoLow];
  }

  // おトク額：市場の代表値（大手サイト等の中央）とBUYMO上限の差
  let savingText = '';
  const marketMids = channels.map((c) => Math.round((c.priceLow + c.priceHigh) / 2)).filter((n) => n > 0);
  if (marketMids.length && buymoHigh != null) {
    const marketMid = Math.round(marketMids.reduce((a, b) => a + b, 0) / marketMids.length);
    const diff = marketMid - buymoHigh;
    if (diff > 0) savingText = `市場の平均的な販売価格より、BUYMOなら約${Math.round(diff / 10000).toLocaleString()}万円おトク`;
  }

  return {
    channels,
    buymoLow,
    buymoHigh,
    buymoNote: raw.buymoNote ? String(raw.buymoNote).slice(0, 120) : (fromInternal ? 'BUYMOの実際の出品データに基づく想定販売価格' : 'AIによる想定販売価格'),
    savingText,
    summary: raw.summary ? String(raw.summary).slice(0, 240) : '',
    fromInternal,
  };
}
