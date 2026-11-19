import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { isAdminUser } from '@/lib/admin';
import { chatWithClaude, isAiEnabled, toPlainText } from '@/lib/ai';
import { getHearing } from '@/lib/hearing';
import { resolveActor, listSheets } from '@/lib/inspection';
import { matchInspections, buildProposalMessage, PROPOSAL_SYSTEM } from '@/lib/proposal';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ヒアリング＋査定表（展開図）を突き合わせ、AIに最適な買取提案を作らせる。
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const ctx = await getDealerForUser(user.id);
  const admin = await isAdminUser();
  if (!ctx && !admin) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'ただいまAIは準備中です。少し時間をおいてお試しください。' }, { status: 200 });
  }

  const body = (await req.json().catch(() => ({}))) as { hearingId?: string };
  const hearingId = (body.hearingId ?? '').trim();
  if (!hearingId) return NextResponse.json({ error: 'ヒアリングIDが必要です' }, { status: 400 });

  const hearing = await getHearing(hearingId);
  if (!hearing) return NextResponse.json({ error: 'ヒアリングが見つかりません' }, { status: 404 });
  // 自店のヒアリングのみ（本部は全件）
  if (!admin && hearing.dealer_id && hearing.dealer_id !== ctx?.dealerId) {
    return NextResponse.json({ error: 'この顧客情報を閲覧する権限がありません' }, { status: 403 });
  }

  // 同一顧客の査定表（展開図）を収集
  let inspections: Awaited<ReturnType<typeof listSheets>> = [];
  try {
    const actor = await resolveActor();
    if (actor) {
      const all = await listSheets(actor, 200);
      inspections = matchInspections(hearing, all);
    }
  } catch {
    /* 査定表が無くてもヒアリングだけで提案する */
  }

  const message = buildProposalMessage(hearing, inspections);
  try {
    const reply = await chatWithClaude([{ role: 'user', content: message }], PROPOSAL_SYSTEM, { maxTokens: 1400 });
    return NextResponse.json({
      proposal: toPlainText(reply),
      matchedInspections: inspections.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: `提案の作成に失敗しました（${msg}）` }, { status: 200 });
  }
}
