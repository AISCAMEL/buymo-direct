import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/ai';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    history?: { role: string; content: string }[];
  };
  const { message, history = [] } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  const systemPrompt =
    'BUYMOの車売買サポートAIです。ユーザーの中古車の売買に関する質問に丁寧に日本語で回答してください。';

  const historyText = history
    .map((h) => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.content}`)
    .join('\n');

  const prompt = historyText ? `${historyText}\nユーザー: ${message}` : message;

  const reply = await generateWithClaude(prompt, systemPrompt);
  return NextResponse.json({ reply });
}
