import { AREAS } from '@/lib/catalog';

// 都道府県名 → 地方
export const PREF_REGION: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.name, a.region]));
// 陸送シミュレーション用の都道府県リスト（catalog と同じ表記）
export const TRANSPORT_PREFS: string[] = AREAS.map((a) => a.name);

// 地方の西→東ゾーン（距離の目安）。北海道・沖縄は離島加算で別扱い。
const ZONE: Record<string, number> = { 九州: 0, 沖縄: 0, 中国: 1, 四国: 1, 近畿: 2, 中部: 3, 関東: 4, 東北: 5, 北海道: 6 };
const ISLAND: Record<string, number> = { 北海道: 55000, 沖縄: 75000 };

export const CAR_SIZES: { value: string; label: string; factor: number }[] = [
  { value: 'kei', label: '軽自動車', factor: 1.0 },
  { value: 'normal', label: '普通車（セダン・コンパクト）', factor: 1.15 },
  { value: 'minivan', label: 'ミニバン・SUV', factor: 1.3 },
  { value: 'large', label: '大型（1BOX・トラック）', factor: 1.5 },
];

const round1000 = (n: number) => Math.round(n / 1000) * 1000;

/** 陸送料金の概算（片道・キャリアカー目安）。ZEROの料金水準を参考にした目安値。 */
export function estimateTransport(fromPref: string, toPref: string, sizeValue: string): { low: number; high: number } | null {
  const fr = PREF_REGION[fromPref];
  const tr = PREF_REGION[toPref];
  if (!fr || !tr) return null;
  const size = CAR_SIZES.find((s) => s.value === sizeValue) ?? CAR_SIZES[0];
  let base = fr === tr ? 18000 : 20000 + Math.abs(ZONE[fr] - ZONE[tr]) * 9000;
  base += (ISLAND[fr] ?? 0) + (ISLAND[tr] ?? 0);
  base *= size.factor;
  return { low: round1000(base * 0.85), high: round1000(base * 1.15) };
}
