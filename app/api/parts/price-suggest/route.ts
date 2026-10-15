import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateWithClaude, isAiEnabled } from '@/lib/ai';
import { PART_CATEGORY_LABEL, type PartCategory } from '@/lib/part-auction';

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    title?: string; category?: string; item_condition?: string;
    fit_maker?: string; fit_model?: string;
  };
  const category = (body.category ?? 'other') as PartCategory;
  const title = (body.title ?? '').trim();

  // 過去の落札データ（同カテゴリ）から相場レンジを算出
  let samples: number[] = [];
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('part_auctions')
      .select('current_price')
      .eq('category', category)
      .eq('status', 'sold')
      .order('closed_at', { ascending: false })
      .limit(50);
    samples = (data ?? []).map((r: { current_price: number }) => r.current_price).filter((n) => n > 0);
  } catch { samples = []; }

  const med = median(samples);
  const hasAi = isAiEnabled();

  // データが少ない/AIなし → ヒューリスティック
  if (!hasAi || samples.length < 3) {
    const base = med > 0 ? med : 0;
    const start = base > 0 ? round100(base * 0.6) : 0;
    const buy_now = base > 0 ? round100(base * 1.2) : 0;
    return NextResponse.json({
      ai: false,
      sample_count: samples.length,
      median: med,
      start, buy_now,
      low: base > 0 ? round100(base * 0.8) : 0,
      high: base > 0 ? round100(base * 1.3) : 0,
      note: samples.length < 3
        ? '過去の落札データが少ないため、参考値です。商品の状態を見て調整してください。'
        : 'AI未設定のため、過去の落札額から算出した参考値です。',
    });
  }

  // AIで、商品名＋過去落札統計をもとに推奨レンジを算出
  const prompt = `あなたは日本の中古カーパーツ相場に詳しい査定士です。次のオークション出品の推奨価格を提案してください。
商品名: ${title || '（未入力）'}
カテゴリ: ${PART_CATEGORY_LABEL[category] ?? category}
状態: ${body.item_condition === 'new' ? '新品' : '中古'}
適合: ${[body.fit_maker, body.fit_model].filter(Boolean).join(' ') || '指定なし'}
過去の同カテゴリ落札額（円・新しい順・最大50件）: ${samples.slice(0, 50).join(', ') || 'データなし'}
参考中央値: ${med || '不明'}円

次のJSONのみを返してください（説明文やコードブロックは不要）:
{"start": 開始価格(円,整数), "buy_now": 即決価格(円,整数), "low": 想定落札下限(円), "high": 想定落札上限(円), "comment": "一言コメント(40字以内)"}
開始価格は落札想定より控えめ、即決は上限より少し上に。全て100円単位。`;

  try {
    const raw = await generateWithClaude(prompt, undefined, undefined, 400);
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonText) as { start?: number; buy_now?: number; low?: number; high?: number; comment?: string };
    return NextResponse.json({
      ai: true,
      sample_count: samples.length,
      median: med,
      start: round100(Number(parsed.start) || 0),
      buy_now: round100(Number(parsed.buy_now) || 0),
      low: round100(Number(parsed.low) || 0),
      high: round100(Number(parsed.high) || 0),
      note: parsed.comment ?? '過去の落札データとAIによる推定値です。最終判断はご自身で。',
    });
  } catch {
    const base = med > 0 ? med : 0;
    return NextResponse.json({
      ai: false,
      sample_count: samples.length,
      median: med,
      start: base > 0 ? round100(base * 0.6) : 0,
      buy_now: base > 0 ? round100(base * 1.2) : 0,
      low: base > 0 ? round100(base * 0.8) : 0,
      high: base > 0 ? round100(base * 1.3) : 0,
      note: 'AI応答の解析に失敗したため、過去の落札額からの参考値です。',
    });
  }
}
