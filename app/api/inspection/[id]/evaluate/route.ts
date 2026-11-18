import { NextResponse } from 'next/server';
import { resolveActor, getSheet, updateSheet, canAccess } from '@/lib/inspection';
import { computeEvaluation, viewLabel, sizeLabel, damageTypeMeta, type DamageMark, type AiEval } from '@/lib/inspection-spec';
import { generateWithClaude, isAiEnabled, toPlainText } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const sheet = await getSheet(id);
  if (!sheet || !canAccess(actor, sheet)) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  // クライアントから最新の下書き（未保存分）を受け取れる
  const body = (await req.json().catch(() => ({}))) as { damages?: DamageMark[]; repairHistory?: boolean };
  const damages = Array.isArray(body.damages) ? body.damages : sheet.damages ?? [];
  const repairHistory = typeof body.repairHistory === 'boolean' ? body.repairHistory : !!sheet.repair_history;

  // 1) 計算式で評価点を算出（決定的）
  const ev = computeEvaluation(damages, { repairHistory });

  // 2) AIが最終所見と推奨査定額を提示（計算結果を土台に）
  let summary = '';
  let priceLow: number | null = null;
  let priceHigh: number | null = null;

  if (isAiEnabled()) {
    const v = (sheet.vehicle ?? {}) as Record<string, string>;
    const dmgLines = damages.length
      ? damages.map((d) => `・${viewLabel(d.view)}：${damageTypeMeta(d.type)?.label ?? d.type}（大きさ${sizeLabel(d.size)}）${d.note ? '／' + d.note : ''}`).join('\n')
      : '（記録された外装ダメージなし）';
    const prompt = [
      `以下は中古車の現車検査の結果です。計算式で算出した評価点を踏まえ、査定の最終所見と推奨査定額レンジを提示してください。`,
      ``,
      `【車両】${[sheet.maker, sheet.model].filter(Boolean).join(' ') || '不明'} / ${sheet.model_year ?? '?'}年 / 走行${sheet.mileage_km != null ? sheet.mileage_km.toLocaleString() + 'km' : '不明'} / グレード${v.grade || '不明'} / 車検${v.shaken_until || '不明'}`,
      `【修復歴】${repairHistory ? 'あり' : 'なし'}`,
      `【外装ダメージ（展開図）】\n${dmgLines}`,
      `【計算式による評価点】${ev.score}点（100点満点）／ 相当グレード ${ev.grade} ／ オークション相当 ${ev.auction} ／ 減点合計 ${ev.total}（うちダメージ${ev.damagePoints}・修復歴${ev.repairPoints}）`,
      sheet.appraised_price != null ? `【担当入力の査定額】¥${sheet.appraised_price.toLocaleString()}` : '',
      ``,
      `出力は必ず次のJSONのみ（前後に文章を付けない）：`,
      `{"summary":"査定の所見を日本語で3〜5文。評価点の根拠（主な減点要因）・状態の良い点・買取判断の要点を簡潔に。プレーンテキスト。","priceLow":整数またはnull,"priceHigh":整数またはnull}`,
      `priceLow/priceHigh は推奨買取額レンジ（円）。相場が判断できない場合は null。担当入力の査定額があれば参考にしてよい。`,
    ].filter(Boolean).join('\n');

    try {
      const raw = await generateWithClaude(prompt, 'あなたは中古車査定の専門家です。必ず指定のJSONだけを返します。', undefined, 600);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]) as { summary?: string; priceLow?: number | null; priceHigh?: number | null };
        summary = toPlainText(String(j.summary ?? '')).slice(0, 1200);
        priceLow = typeof j.priceLow === 'number' && isFinite(j.priceLow) ? Math.round(j.priceLow) : null;
        priceHigh = typeof j.priceHigh === 'number' && isFinite(j.priceHigh) ? Math.round(j.priceHigh) : null;
      }
    } catch {
      /* AI失敗時は計算結果のみ */
    }
  }

  if (!summary) {
    summary = `計算式による評価点は${ev.score}点（相当グレード${ev.grade}）。` +
      (repairHistory ? '修復歴ありのため大きく減点しています。' : '') +
      (ev.deductions.length ? `主な減点：${ev.deductions.slice(0, 3).map((d) => d.label).join('、')}。` : '外装の目立つダメージはありません。');
  }

  const ai_eval: AiEval = {
    score: ev.score, grade: ev.grade, auction: ev.auction,
    priceLow, priceHigh, summary, computedAt: new Date().toISOString(),
  };

  // 保存（展開図・修復歴・AI評価をまとめて）
  await updateSheet(id, { damages, repair_history: repairHistory, ai_eval, overall_rating: sheet.overall_rating ?? ev.grade });

  return NextResponse.json({ ok: true, evaluation: ev, ai_eval });
}
