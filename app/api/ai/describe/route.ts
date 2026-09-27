import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWithClaude } from '@/lib/ai';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    mode?: 'generate' | 'polish';
    text?: string;
    kind?: 'vehicle' | 'profile' | 'skill';
    maker?: string;
    model?: string;
    year?: number;
    mileage_km?: number;
    condition?: string;
    options?: string;
  };
  const mode = body.mode ?? 'generate';
  const hasAi = !!process.env.ANTHROPIC_API_KEY;

  // ── 添削モード：既存の文章を自然な日本語に整える（事実は変えない） ──
  if (mode === 'polish') {
    const text = (body.text ?? '').trim();
    if (!text) return NextResponse.json({ error: '添削する文章がありません' }, { status: 400 });
    if (!hasAi) return NextResponse.json({ description: text, ai: false, note: 'AI未設定のため原文を返しました' });
    const label = body.kind === 'profile' ? '店舗紹介文' : body.kind === 'skill' ? 'サービス説明文' : '出品説明文';
    const prompt = `次の中古車${label}を添削してください。
・事実や数値は変えない（誇張・虚偽は禁止）
・誤字脱字・不自然な表現を直す
・購入者/依頼者に魅力が伝わる、丁寧で読みやすい日本語に
・200〜300字程度。説明文のみを返す（前置き不要）

--- 元の文章 ---
${text}`;
    const description = await generateWithClaude(prompt);
    return NextResponse.json({ description, ai: true });
  }

  // ── 生成モード ──
  const { maker, model, year, mileage_km, condition, options } = body;
  if (!maker || !model || !year || mileage_km == null || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // AI未設定時は入力値からテンプレ文を組み立てて返す（手入力の下地になる）
  if (!hasAi) {
    const tmpl = `${year}年式の${maker} ${model}です。走行距離は約${Number(mileage_km).toLocaleString('ja-JP')}km、コンディションは${condition}。${options ? options + '。' : ''}ご不明な点はお気軽にお問い合わせください。現車確認も歓迎です。`;
    return NextResponse.json({ description: tmpl, ai: false, note: 'AI未設定のためテンプレートを生成しました' });
  }

  const prompt = `以下の中古車の出品説明文を200字以内の日本語で作成してください。

メーカー: ${maker}
モデル: ${model}
年式: ${year}年
走行距離: ${Number(mileage_km).toLocaleString('ja-JP')}km
コンディション: ${condition}
${options ? `特記事項: ${options}` : ''}

200字以内で簡潔に、購入者が魅力を感じる説明文を作成してください。事実に基づき、誇張は避けてください。余分な説明や前置きは不要です。説明文のみ返してください。`;

  const description = await generateWithClaude(prompt);
  return NextResponse.json({ description, ai: true });
}
