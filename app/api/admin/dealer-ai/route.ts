import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { chatWithClaude, isAiEnabled, toPlainText, type ChatTurn } from '@/lib/ai';
import {
  getDealerAiSettings,
  setDealerAiSettings,
  buildDealerAiSystem,
  DEFAULT_DEALER_AI_TONE,
  type DealerAiSettings,
} from '@/lib/dealer-ai-settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function coerce(input: unknown): DealerAiSettings {
  const s = (input ?? {}) as Partial<DealerAiSettings>;
  return {
    enabled: s.enabled !== false,
    tone: typeof s.tone === 'string' && s.tone.trim() ? s.tone : DEFAULT_DEALER_AI_TONE,
    extraKnowledge: typeof s.extraKnowledge === 'string' ? s.extraKnowledge : '',
  };
}

export async function GET() {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  return NextResponse.json({ settings: await getDealerAiSettings(), aiOn: isAiEnabled() });
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    settings?: unknown;
    question?: string;
    history?: { role: string; content: string }[];
  };
  const action = body.action === 'test' ? 'test' : 'save';
  const settings = coerce(body.settings);

  // 保存
  if (action === 'save') {
    const saved = await setDealerAiSettings(settings);
    if (!saved.ok) return NextResponse.json({ ok: false, error: saved.error ?? '保存に失敗しました' }, { status: 500 });
    return NextResponse.json({ ok: true, settings });
  }

  // その場テスト（下書き設定で実際にAIへ問い合わせ、保存前に回答を確認）
  if (!isAiEnabled()) {
    return NextResponse.json({ reply: 'AI未設定のためテストできません（ANTHROPIC_API_KEY が必要）。', source: 'disabled' });
  }
  const question = (body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: '質問が空です' }, { status: 400 });

  const system = buildDealerAiSystem(settings, {
    dealerName: '（テスト店舗）',
    role: 'owner',
    pageLabel: 'ダッシュボード',
    pagePath: '/dealer/dashboard',
  });
  const turns: ChatTurn[] = (body.history ?? [])
    .slice(-16)
    .map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content } as ChatTurn))
    .filter((t) => t.content && t.content.trim());
  turns.push({ role: 'user', content: question });

  try {
    const reply = await chatWithClaude(turns, system, { maxTokens: 1200 });
    return NextResponse.json({ reply: toPlainText(reply), source: 'ai' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ reply: `テスト中にエラー（${msg}）。`, source: 'error' }, { status: 200 });
  }
}
