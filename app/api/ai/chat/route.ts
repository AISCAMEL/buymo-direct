import { NextResponse } from 'next/server';
import { generateWithClaude, isAiEnabled } from '@/lib/ai';
import { faqMatch, type Audience } from '@/lib/faq';

const FALLBACK_MEMBER =
  'ご質問ありがとうございます。買取・ダイレクト販売・エスクロー・手数料・必要書類・操作方法などについてお答えできます。詳しくは「無料査定」からご相談いただくか、お問い合わせください。';
const FALLBACK_DEALER =
  'ご質問ありがとうございます。加盟店の申込・案件の受け方・費用/報酬・出品方法・スタッフ招待・必要書類・入金などについてお答えできます。解決しない場合はダッシュボードの「サポート」からご連絡ください。';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    history?: { role: string; content: string }[];
    context?: string;
    audience?: string;
  };
  const { message, history = [], context } = body;
  const audience: Audience = body.audience === 'dealer' ? 'dealer' : 'member';
  const fallback = audience === 'dealer' ? FALLBACK_DEALER : FALLBACK_MEMBER;

  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // AIキーが無い場合は FAQ で回答（的確な定型回答・会員/加盟店で振り分け）
  if (!isAiEnabled()) {
    return NextResponse.json({ reply: faqMatch(message, audience) ?? fallback, source: 'faq', audience });
  }

  const common = [
    'BUYMOは中古車の「買取」と「ダイレクト販売（買取保証つきの個人間売買）」の両方を提供する統合サービスです。',
    '将来的には査定・整備・車検・電装・清掃・コーティング・陸送・名義変更などを扱う「車の総合マーケットプレイス（車のプロを探して依頼できる）」を目指しています。',
    '特徴：明朗な手数料の買取／買取保証つきのダイレクト販売／エスクロー決済で安全／名義変更まで代行／全国対応。',
    'システムやページの操作・必要書類など「使い方の相談」にも、具体的な手順で答えてください。',
    'ユーザーの質問に、丁寧でわかりやすい日本語で簡潔に回答してください。わからないことは推測せず、無料査定やお問い合わせ（加盟店はダッシュボードのサポート）を案内してください。',
  ];
  const role =
    audience === 'dealer'
      ? [
          'あなたは「BUYMO ダイレクト」の加盟店（車のプロ）向けサポートAIです。',
          '相手は加盟店の事業者です。加盟店ダッシュボードの操作（店舗設定・スタッフ招待・作業事例・案件/依頼の受注・出品/オークション・API/在庫連携・売上/入金・古物商などの書類）を前提に、運用目線で具体的に案内してください。',
        ]
      : [
          'あなたは「BUYMO ダイレクト」の会員（一般ユーザー）向けサポートAIです。',
          '相手は車を売買する一般ユーザーです。出品・査定・購入・エスクロー・名義変更・必要書類・マイページ操作などを、はじめての人にもわかるように案内してください。',
        ];
  const systemPrompt = [
    ...role,
    ...common,
    context ? `ユーザーは今「${context}」を見ています。この文脈に沿って、そのページで迷いやすい点を先回りして具体的に案内してください。` : '',
  ].filter(Boolean).join('\n');

  const historyText = history
    .map((h) => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.content}`)
    .join('\n');
  const prompt = historyText ? `${historyText}\nユーザー: ${message}` : message;

  try {
    const reply = await generateWithClaude(prompt, systemPrompt);
    return NextResponse.json({ reply, source: 'ai', audience });
  } catch {
    return NextResponse.json({ reply: faqMatch(message, audience) ?? fallback, source: 'faq', audience });
  }
}
