import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWithClaude } from '@/lib/ai';
import { BODY_TYPES, TRANSMISSIONS, FUELS, DRIVETRAINS, EQUIPMENT_ALL } from '@/lib/constants';

/**
 * メーカー・車種・年式・型式/グレードから、よくある仕様と装備をAIで推定して下書きを返す。
 * ※ あくまで推定（要確認）。車台番号単体からの正確な特定は外部データベースが必要。
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    maker?: string; model?: string; year?: number; grade?: string; code?: string;
  };
  const maker = (body.maker ?? '').trim();
  const model = (body.model ?? '').trim();
  if (!maker && !model && !body.code) {
    return NextResponse.json({ error: 'メーカー・車種、または型式を入力してください' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ai: false, note: 'AI未設定のため自動入力は利用できません', spec: null });
  }

  const prompt = `あなたは日本の中古車の仕様に詳しいアシスタントです。以下の車両について、一般的な標準〜中位グレードで「ありがち」な仕様と装備を推定し、JSONのみを返してください（前置き・説明・コードフェンス不要）。

メーカー: ${maker || '(不明)'}
車種: ${model || '(不明)'}
年式: ${body.year ?? '(不明)'}
型式: ${body.code || '(不明)'}
グレード: ${body.grade || '(不明)'}

ルール:
- 不明・自信がない項目は null または空配列にする（推測で断定しない）。
- body_type は次のいずれか: ${BODY_TYPES.join(' / ')}
- transmission は次のいずれか: ${TRANSMISSIONS.join(' / ')}
- fuel は次のいずれか: ${FUELS.join(' / ')}
- drivetrain は次のいずれか: ${DRIVETRAINS.join(' / ')}
- equipment は必ず次の候補からのみ選ぶ（候補外は使わない）: ${EQUIPMENT_ALL.join(' / ')}
- equipment はその車種・年式で一般的に付いていることが多いものだけを最大8個。

出力JSONの形:
{"body_type": "", "transmission": "", "fuel": "", "drivetrain": "", "equipment": []}`;

  let raw = '';
  try {
    raw = await generateWithClaude(prompt);
  } catch {
    return NextResponse.json({ error: 'AI推定に失敗しました。時間をおいて再度お試しください。' }, { status: 502 });
  }

  // JSON 抽出（念のためフェンスや前後テキストを除去）
  let parsed: Record<string, unknown> | null = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = m ? (JSON.parse(m[0]) as Record<string, unknown>) : null;
  } catch { parsed = null; }
  if (!parsed) return NextResponse.json({ ai: true, spec: null, note: '推定できませんでした' });

  const pick = (v: unknown, allow: readonly string[]): string | null =>
    typeof v === 'string' && allow.includes(v) ? v : null;

  const equipment = Array.isArray(parsed.equipment)
    ? (parsed.equipment as unknown[]).map(String).filter((e) => EQUIPMENT_ALL.includes(e)).slice(0, 8)
    : [];

  const spec = {
    body_type: pick(parsed.body_type, BODY_TYPES),
    transmission: pick(parsed.transmission, TRANSMISSIONS),
    fuel: pick(parsed.fuel, FUELS),
    drivetrain: pick(parsed.drivetrain, DRIVETRAINS),
    equipment,
  };

  return NextResponse.json({ ai: true, spec });
}
