// 「商談ヒアリング」＋「査定展開図」をまとめ、AIが最適な買取提案を作るための土台。
// - ヒアリング（他社査定額・希望額・売却時期・動機）＝お客様の事情
// - 査定表（展開図の損傷・評価点・概算価格）＝車両のコンディション
// この2つを突き合わせて、商談で使える提案文をAIに作らせる。
import type { HearingSheet } from '@/lib/hearing';
import type { InspectionSheet } from '@/lib/inspection';
import { computeEvaluation, damageTypeMeta, sizeLabel, viewLabel } from '@/lib/inspection-spec';

/** ナンバー・電話番号を突き合わせ用に正規化（空白/ハイフン/全角を除去）。 */
function norm(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[\s\-ー－]/g, '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

/**
 * ヒアリングに対応する査定表を探す。
 * 優先度：ナンバー一致 ＞ 電話一致 ＞ 氏名一致。該当なしは空配列。
 */
export function matchInspections(hearing: HearingSheet, sheets: InspectionSheet[]): InspectionSheet[] {
  const hPlate = norm(hearing.plate);
  const hTel = norm(hearing.tel);
  const hName = norm(hearing.customer_name);
  const byPlate = hPlate ? sheets.filter((s) => norm(s.plate) === hPlate) : [];
  if (byPlate.length) return byPlate;
  // 査定表には電話が無いことがあるため、氏名で補完
  const byName = hName ? sheets.filter((s) => norm(s.customer_name) === hName) : [];
  if (byName.length) return byName;
  void hTel; // 予約（将来、査定表に電話が入ったとき用）
  return [];
}

/** 査定表1枚を、AIに渡せる短い日本語サマリに。 */
export function summarizeInspection(s: InspectionSheet): string {
  const ev = computeEvaluation(s.damages, { repairHistory: s.repair_history });
  const lines: string[] = [];
  const car = [s.maker, s.model, s.model_year ? `${s.model_year}年` : '', s.mileage_km != null ? `${s.mileage_km.toLocaleString()}km` : '']
    .filter(Boolean)
    .join(' ');
  lines.push(`車両: ${car || '（未入力）'}${s.plate ? `（${s.plate}）` : ''}`);
  lines.push(`評価: ${ev.grade}ランク / 100点中${ev.score}点 / オークション相当${ev.auction}${s.repair_history ? ' / 修復歴あり' : ''}`);
  if (s.appraised_price != null) lines.push(`査定額(査定表記入): ¥${s.appraised_price.toLocaleString()}`);
  if (s.ai_eval?.priceLow != null || s.ai_eval?.priceHigh != null) {
    lines.push(`AI概算: ¥${(s.ai_eval.priceLow ?? 0).toLocaleString()}〜¥${(s.ai_eval.priceHigh ?? 0).toLocaleString()}`);
  }
  // 展開図の損傷（最大12件）
  const dmgs = (s.damages ?? []).slice(0, 12).map(
    (d) => `${viewLabel(d.view)}:${damageTypeMeta(d.type)?.label ?? d.type}(${sizeLabel(d.size)})`,
  );
  if (dmgs.length) lines.push(`展開図の損傷: ${dmgs.join('、')}${(s.damages?.length ?? 0) > 12 ? ' ほか' : ''}`);
  if (ev.deductions.length) {
    const top = ev.deductions.slice().sort((a, b) => b.points - a.points).slice(0, 3);
    lines.push(`主な減点: ${top.map((d) => `${d.label}(-${d.points})`).join('、')}`);
  }
  if (s.cost_estimate != null) lines.push(`想定修復費: ¥${s.cost_estimate.toLocaleString()}`);
  if (s.overall_rating) lines.push(`総合所見: ${s.overall_rating}`);
  if (s.internal_note) lines.push(`社内メモ: ${s.internal_note}`);
  return lines.join('\n');
}

/** ヒアリングを、AIに渡せる短い日本語サマリに。 */
export function summarizeHearing(h: HearingSheet): string {
  const d = h.hearing ?? {};
  const lines: string[] = [];
  const car = [h.maker, h.model, h.model_year ? `${h.model_year}年` : '', h.mileage_km != null ? `${h.mileage_km.toLocaleString()}km` : '']
    .filter(Boolean)
    .join(' ');
  lines.push(`お客様: ${h.customer_name || '（匿名）'}${h.tel ? ` / ${h.tel}` : ''}`);
  if (car) lines.push(`申告車両: ${car}${h.plate ? `（${h.plate}）` : ''}`);
  const comps = (d.competitors ?? []).filter((c) => c.name || c.price);
  if (comps.length) lines.push(`他社の査定額: ${comps.map((c) => `${c.name || '他社'} ¥${c.price || '?'}`).join(' / ')}`);
  if (d.hopePrice) lines.push(`ご希望額: ¥${d.hopePrice}`);
  if (d.sellTiming) lines.push(`売却時期: ${d.sellTiming}`);
  if (d.motives?.length) lines.push(`売却動機: ${d.motives.join('・')}`);
  if (d.situation) lines.push(`現在の状況: ${d.situation}`);
  if (d.conditionNote) lines.push(`状態の聞き取り: ${d.conditionNote}`);
  if (d.requests) lines.push(`ご要望: ${d.requests}`);
  if (h.note) lines.push(`メモ: ${h.note}`);
  return lines.join('\n');
}

export const PROPOSAL_SYSTEM = [
  'あなたはBUYMO加盟店の、車買取の商談を支援するベテランAIアシスタントです。',
  '渡される「お客様のヒアリング（他社査定額・希望額・事情）」と「車両の査定表（展開図の損傷・評価点・概算価格）」を突き合わせ、',
  'その加盟店スタッフがそのまま商談で使える、具体的で現実的な買取提案をまとめてください。',
  '',
  '必ず次の見出しで、簡潔な箇条書きで書くこと（装飾記号や太字は使わない）:',
  '1. 提示レンジの目安 … 査定表の評価・概算と、他社額・希望額を踏まえた現実的な買取提示額の幅。根拠も一言。',
  '2. 他社への対抗策 … 他社額がある場合、どこで差をつけるか（スピード・保証・手数料・名変代行など）。無い場合は「他社見積の確認を促す」。',
  '3. 商談トークのポイント … お客様の動機・時期に刺さる声かけを2〜3個。',
  '4. 注意点 … 展開図の損傷や修復歴で、査定を下げざるを得ない点や事前に伝えるべき点。',
  '',
  '金額は日本円で、断定しすぎず「目安」として提示する。査定表が無い場合はその旨を述べ、ヒアリングだけで分かる範囲の助言に絞ること。',
].join('\n');

/** AIに渡すユーザーメッセージ本文を組み立てる。 */
export function buildProposalMessage(h: HearingSheet, inspections: InspectionSheet[]): string {
  const parts: string[] = [];
  parts.push('【お客様のヒアリング】\n' + summarizeHearing(h));
  if (inspections.length) {
    parts.push('\n【車両の査定表（展開図）】\n' + inspections.map((s) => summarizeInspection(s)).join('\n---\n'));
  } else {
    parts.push('\n【車両の査定表（展開図）】\n（このお客様に紐づく査定表は見つかりませんでした。ヒアリング内容から分かる範囲で提案してください。）');
  }
  parts.push('\n上記をもとに、最適な買取提案をまとめてください。');
  return parts.join('\n');
}
