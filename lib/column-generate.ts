// AIコラム自動生成パイプライン。
//  1) Claude（web_search）で最新情報を収集し、BUYMOのコラム記事をオリジナルで執筆
//  2) OpenRouter で記事イメージ（サムネイル）を生成
//  3) Supabase Storage に画像アップロード、columns テーブルへ保存（公開）
import Anthropic from '@anthropic-ai/sdk';
import { anthropicClient, aiChatModel } from '@/lib/ai';
import { generateImageOpenRouter } from '@/lib/openrouter-image';
import { createServiceClient } from '@/lib/supabase/service';
import { loadDbColumns } from '@/lib/columns-db';
import { COLUMNS } from '@/lib/columns';

export const COLUMN_CATS = ['相場', '事故車', '書類', 'タイミング', '名義変更', '買取の流れ', 'ダイレクト販売', 'メンテナンス', '税金・制度', 'その他'] as const;

export type GeneratedColumn = {
  title: string;
  meta: string;
  cat: string;
  html: string;
  imagePrompt: string;
  sources: { title?: string; url?: string }[];
};

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/** テキストから JSON オブジェクトを取り出してパース。 */
function parseJsonObject(text: string): GeneratedColumn | null {
  const cleaned = stripFences(text.trim());
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (!obj || typeof obj.title !== 'string' || typeof obj.html !== 'string') return null;
    return {
      title: String(obj.title).slice(0, 120),
      meta: String(obj.meta ?? '').slice(0, 200),
      cat: String(obj.cat ?? 'その他').slice(0, 24),
      html: sanitizeHtml(String(obj.html)),
      imagePrompt: String(obj.imagePrompt ?? '').slice(0, 600),
      sources: Array.isArray(obj.sources)
        ? obj.sources.slice(0, 8).map((x: Record<string, unknown>) => ({ title: String(x?.title ?? '').slice(0, 160), url: String(x?.url ?? '').slice(0, 400) }))
        : [],
    };
  } catch {
    return null;
  }
}

/** 本文HTMLから危険なタグを除去（自前生成だが念のため）。 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/ on[a-z]+="[^"]*"/gi, '')
    .replace(/ on[a-z]+='[^']*'/gi, '');
}

function slugFor(): string {
  const d = new Date(Date.now() + 9 * 3600_000); // JST
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7);
  return `ai-${ymd}-${rand}`;
}

/** Claude(web_search) で記事を1本執筆。最近の重複を避けるため既存タイトルを渡す。 */
async function writeArticle(client: Anthropic): Promise<GeneratedColumn | null> {
  const recentTitles = [
    ...COLUMNS.map((c) => c.title),
    ...(await loadDbColumns(20)).map((c) => c.title),
  ].slice(0, 40);

  const system = [
    'あなたは中古車マーケットプレイス「BUYMO ダイレクト」（合同会社アイズ）の編集者です。',
    'BUYMOは中古車の「買取」と「ダイレクト販売（買取保証つき個人間売買）」を提供し、エスクロー決済・名義変更代行・全国対応・明朗な手数料が特徴です。',
    'あなたの仕事は、日本の読者に役立つ中古車の売買に関するコラム記事を1本、オリジナルで執筆することです。',
    'web_search ツールで最新かつ日本国内の実情（相場傾向・制度/税制・季節要因・手続き・注意点など）を調べ、事実に基づいて書いてください。',
    '他サイトの文章をそのままコピーせず、必ず自分の言葉で分かりやすく再構成してください（丸写し厳禁）。',
    '誇大・断定的な表現や、根拠のない価格保証は避け、中立で実用的に。最後は自然にBUYMOの無料査定/相談に触れてOK（宣伝くさくしない）。',
  ].join('\n');

  const user = [
    '次の条件で、BUYMOコラム記事を1本書いてください。',
    `カテゴリは次から1つ選ぶ: ${COLUMN_CATS.join(' / ')}`,
    '読者は車を売りたい/買いたい一般の方。1500〜2500文字程度。見出し(h2/h3)・表・箇条書きを使って読みやすく。',
    '最新の話題性（今の季節・直近の制度変更や相場傾向など）を1つ以上盛り込む。',
    `すでにある記事と内容が重複しないテーマにする。既存タイトル例:\n- ${recentTitles.join('\n- ')}`,
    '',
    '出力は次のJSONオブジェクトのみ（前後に説明やコードブロック記号を付けない）:',
    '{',
    '  "title": "記事タイトル（32文字前後・キーワードを含む）",',
    '  "meta": "SEO用の説明文（120文字以内）",',
    '  "cat": "上のカテゴリから1つ",',
    '  "html": "本文HTML。<p>,<h2>,<h3>,<ul>,<li>,<table>,<tr>,<th>,<td>,<strong> のみ使用。先頭に要点の<div class=\\"answer\\">結論：...</div> を置く",',
    '  "imagePrompt": "記事に合うサムネ画像の英語プロンプト（写実的でクリーン、車/書類/日本の街など。画像内に文字は入れない）",',
    '  "sources": [{"title":"参考にしたページ名","url":"URL"}]',
    '}',
  ].join('\n');

  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }] as unknown as Anthropic.ToolUnion[];

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: user }];
  let last: Anthropic.Message | null = null;

  // pause_turn（サーバーツール継続）に最大3回まで対応
  for (let i = 0; i < 4; i++) {
    const msg = await client.messages.create({
      model: aiChatModel(),
      max_tokens: 6000,
      system,
      output_config: { effort: 'medium' },
      tools,
      messages,
    });
    last = msg;
    if (msg.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: msg.content });
      continue;
    }
    break;
  }
  if (!last) return null;

  // 最後のテキストブロックから JSON を取り出す
  let text = '';
  for (const block of last.content) if (block.type === 'text') text = block.text;
  return parseJsonObject(text);
}

export type GenerateResult =
  | { ok: true; slug: string; title: string; hadImage: boolean }
  | { ok: false; reason: string };

/** コラムを1本生成して保存・公開する。 */
export async function generateAndSaveColumn(): Promise<GenerateResult> {
  const client = anthropicClient();
  if (!client) return { ok: false, reason: 'ANTHROPIC_API_KEY が未設定です' };

  let article: GeneratedColumn | null = null;
  try {
    article = await writeArticle(client);
  } catch (e) {
    return { ok: false, reason: `執筆に失敗: ${e instanceof Error ? e.message : 'unknown'}` };
  }
  if (!article) return { ok: false, reason: '記事の生成（JSON解析）に失敗しました' };

  const svc = createServiceClient();
  const slug = slugFor();

  // 画像生成（OpenRouter）→ Storage アップロード（失敗しても記事は保存）
  let thumbUrl: string | null = null;
  try {
    const img = await generateImageOpenRouter(
      `${article.imagePrompt}. Editorial thumbnail for a Japanese used-car marketplace blog. Clean, realistic, no text, no watermark, 16:9.`,
    );
    if (img) {
      const ext = img.contentType.includes('jpeg') ? 'jpg' : img.contentType.includes('webp') ? 'webp' : 'png';
      const path = `columns/${slug}.${ext}`;
      const up = await svc.storage.from('listing-images').upload(path, img.buffer, { contentType: img.contentType, upsert: true, cacheControl: '86400' });
      if (!up.error) thumbUrl = svc.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    }
  } catch {
    /* 画像失敗は無視 */
  }

  const cat = (COLUMN_CATS as readonly string[]).includes(article.cat) ? article.cat : 'その他';
  const { error } = await svc.from('columns').insert({
    slug,
    title: article.title,
    meta: article.meta,
    cat,
    html: article.html,
    thumb_url: thumbUrl,
    sources: article.sources,
    model: aiChatModel(),
    published: true,
  });
  if (error) return { ok: false, reason: `保存に失敗: ${error.message}（columns テーブル未作成の可能性）` };

  return { ok: true, slug, title: article.title, hadImage: !!thumbUrl };
}
