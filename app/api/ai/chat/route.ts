import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/ai';
import { faqMatch } from '@/lib/faq';

const FALLBACK =
  'ご質問ありがとうございます。買取・ダイレクト販売・エスクロー・手数料・必要書類などについてお答えできます。詳しくは「無料査定」からご相談いただくか、お問い合わせください。';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    history?: { role: string; content: string }[];
    context?: string;
  };
  const { message, history = [], context } = body;

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
    '将来的には査定・整備・車検・電装・清掃・コーティング・陸送・名義変更などを扱う「車の総合マーケットプレイス（車のプロを探して依頼できる）」を目指しています。',
    '特徴：明朗な手数料の買取／買取保証つきのダイレクト販売／エスクロー決済で安全／名義変更まで代行／全国対応。',
    context ? `ユーザーは今「${context}」を見ています。この文脈に沿って、そのページで迷いやすい点を先回りして具体的に案内してください。` : '',
    'ユーザーの質問に、丁寧でわかりやすい日本語で簡潔に回答してください。わからないことは推測せず、無料査定やお問い合わせを案内してください。',
  ].filter(Boolean).join('\n');

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
