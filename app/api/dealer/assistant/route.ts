import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { chatWithClaude, isAiEnabled, toPlainText, type ChatTurn } from '@/lib/ai';
import { getDealerAiSettings, buildDealerAiSystem } from '@/lib/dealer-ai-settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  // 加盟店ユーザーのみ
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const ctx = await getDealerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: '加盟店アカウントではありません' }, { status: 403 });

  const settings = await getDealerAiSettings();
  if (!settings.enabled) {
    return NextResponse.json({
      reply: 'ただいまヘルプAIはお休み中です。お急ぎのご相談は「コミュニティ」（/community）から本部へご連絡ください。',
      source: 'disabled',
    });
  }
  if (!isAiEnabled()) {
    return NextResponse.json({
      reply: 'ただいまAIヘルプを準備中です。恐れ入りますが、ご不明点は「コミュニティ」（/community）から本部へご相談ください。',
      source: 'disabled',
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    question?: string;
    history?: { role: string; content: string }[];
    pageLabel?: string;
    pagePath?: string;
  };
  const question = (body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: '質問が空です' }, { status: 400 });

  // 店舗名（文脈用。個人情報ではない）
  let dealerName: string | undefined;
  try {
    const { data } = await supabase.from('dealers').select('name').eq('id', ctx.dealerId).maybeSingle();
    dealerName = (data as { name?: string } | null)?.name;
  } catch {
    /* noop */
  }

  const system = buildDealerAiSystem(settings, {
    dealerName,
    role: ctx.role,
    pageLabel: typeof body.pageLabel === 'string' ? body.pageLabel.slice(0, 40) : undefined,
    pagePath: typeof body.pagePath === 'string' ? body.pagePath.slice(0, 80) : undefined,
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
    return NextResponse.json(
      { reply: `うまく回答できませんでした（${msg}）。少し時間をおくか、/community から本部へご相談ください。`, source: 'error' },
      { status: 200 },
    );
  }
}
