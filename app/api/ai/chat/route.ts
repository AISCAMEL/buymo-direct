import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/ai';
import { faqMatch } from '@/lib/faq';

const FALLBACK =
  'ご質問ありがとうございます。買取・ダイレクト販売・エスクロー・手数料・必要書類などについてお答えできます。詳しくは「無料査定」からご相談いただくか、お問い合わせください。';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    history?: { role: string; content: string }[];
  };
  const { message, history = [] } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // AIキーが無い場合は FAQ で回答（的確な定型回答）
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: faqMatch(message) ?? FALLBACK, source: 'faq' });
  }

  const systemPrompt = [
    'あなたは「BUYMO ダイレクト」のサポートAIです。',
    'BUYMOは中古車の「買取」と「ダイレクト販売（買取保証つきの個人間売買）」の両方を提供する統合サービスです。',
    '特徴：手数料0円の買取／買取保証つきのダイレクト販売／エスクロー決済で安全／名義変更まで代行／全国47都道府県対応。',
    'ユーザーの質問に、丁寧でわかりやすい日本語で簡潔に回答してください。不明点は無料査定やお問い合わせを案内してください。',
  ].join('\n');

  const historyText = history
    .map((h) => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.content}`)
    .join('\n');
  const prompt = historyText ? `${historyText}\nユーザー: ${message}` : message;

  try {
    const reply = await generateWithClaude(prompt, systemPrompt);
    return NextResponse.json({ reply, source: 'ai' });
  } catch {
    return NextResponse.json({ reply: faqMatch(message) ?? FALLBACK, source: 'faq' });
  }
}
