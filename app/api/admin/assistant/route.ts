import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { chatWithClaude, isAiEnabled, toPlainText, type ChatTurn } from '@/lib/ai';
import { OPS_GUIDE } from '@/lib/ops-guide';
import { gatherOpsSnapshot, snapshotToText } from '@/lib/ops-snapshot';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 管理者のみ
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  if (!isAiEnabled()) {
    return NextResponse.json({
      reply:
        'AIが未設定のため回答できません。運営者へ：Vercel の環境変数に ANTHROPIC_API_KEY（Claude APIキー）を設定すると、この運用アシスタントが有効になります。',
      source: 'disabled',
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    question?: string;
    history?: { role: string; content: string }[];
    mode?: string;
  };
  const question = (body.question ?? '').trim();
  const mode = body.mode === 'monitor' ? 'monitor' : 'howto';
  if (!question) return NextResponse.json({ error: '質問が空です' }, { status: 400 });

  // 監視モードでは現況スナップショット（件数中心）を文脈に含める
  let snapshotText = '';
  if (mode === 'monitor') {
    try {
      snapshotText = snapshotToText(await gatherOpsSnapshot());
    } catch {
      snapshotText = '（現況スナップショットの取得に失敗しました）';
    }
  }

  const system = [
    'あなたは中古車マーケットプレイス「BUYMO ダイレクト」（合同会社アイズ）の運営スタッフ専用のAIアシスタントです。',
    '相手は社内の運営担当者です。目的は、(1)管理機能の使い方の案内と、(2)運営状況の監視サマリー・注意喚起です。',
    '回答は簡潔で実務的な日本語。手順は「どの画面（パス）で何をするか」を具体的に。推測で断定せず、確認が必要な点は明示してください。',
    '返答はプレーンテキストで（Markdownの ** や # や - は使わない）。箇条書きが必要なときは行頭に「・」を使ってください。',
    '個人情報（氏名・連絡先など）は扱いません。件数・状態・傾向をもとに助言してください。',
    OPS_GUIDE,
    snapshotText
      ? `以下は現在の運営状況です。これをもとに、注意すべき点（滞留・異常・要対応）を優先度つきで指摘し、次のアクションを提案してください。\n${snapshotText}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const turns: ChatTurn[] = (body.history ?? [])
    .slice(-16)
    .map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content } as ChatTurn))
    .filter((t) => t.content && t.content.trim());
  turns.push({ role: 'user', content: question });

  try {
    const reply = await chatWithClaude(turns, system, { maxTokens: 1400 });
    return NextResponse.json({ reply: toPlainText(reply), source: 'ai', mode });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json(
      { reply: `AIの呼び出しに失敗しました（${msg}）。APIキーや利用枠をご確認ください。`, source: 'error' },
      { status: 200 },
    );
  }
}
