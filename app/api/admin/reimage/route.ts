// 既存コラムの画像を現在のスタイルで作り直す（本文はそのまま、画像だけ差し替え）。管理者のみ。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { getDbColumn } from '@/lib/columns-db';
import { generateWithClaude, aiUtilityModel } from '@/lib/ai';
import { generateImageOpenRouter } from '@/lib/openrouter-image';
import { getImageStyle, getImageRef, getImagePeople, composeImagePrompt } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = (body.slug ?? '').trim();
  if (!slug) return NextResponse.json({ ok: false, error: 'slug がありません' }, { status: 400 });

  const col = await getDbColumn(slug);
  if (!col) return NextResponse.json({ ok: false, error: '記事が見つかりません' }, { status: 404 });

  // 1) タイトル・概要から「実写できる英語シーン描写」を作る
  let scene = '';
  try {
    scene = (
      await generateWithClaude(
        '日本の中古車売買コラム記事に合う画像の英語シーン描写を1文で作ってください。' +
          '実写写真として撮影できる具体的な実在シーン（実物の車・書類・人・日本の風景など）。' +
          'グラフ・チャート・アイコン・文字・3Dイラストは禁止。引用符や説明は付けず、英語の描写だけを出力。\n\n' +
          `タイトル: ${col.title}\n概要: ${col.meta}\nカテゴリ: ${col.cat}`,
        undefined,
        aiUtilityModel(),
        200,
      )
    ).trim();
  } catch {
    /* フォールバックへ */
  }
  if (!scene) scene = `a realistic photograph related to buying and selling used cars in Japan, about: ${col.title}`;

  // 2) 画像生成（現在のスタイル指示文＋基準画像）
  const [style, people] = await Promise.all([getImageStyle(), getImagePeople()]);
  const ref = await getImageRef();
  const prompt = composeImagePrompt(style, people, scene);
  const { image, diagnostic, model } = await generateImageOpenRouter(prompt, ref ?? undefined);
  if (!image) return NextResponse.json({ ok: false, slug, error: diagnostic || '画像生成に失敗しました', model });

  // 3) Storage 上書き ＋ thumb_url 更新（キャッシュ回避に ?v= を付与）
  try {
    const svc = createServiceClient();
    const ext = image.contentType.includes('jpeg') ? 'jpg' : image.contentType.includes('webp') ? 'webp' : 'png';
    const path = `columns/${slug}.${ext}`;
    const up = await svc.storage
      .from('listing-images')
      .upload(path, image.buffer, { contentType: image.contentType, upsert: true, cacheControl: '86400' });
    if (up.error) return NextResponse.json({ ok: false, slug, error: `アップロード失敗: ${up.error.message}` });
    const base = svc.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    const url = `${base}?v=${Date.now()}`;
    const { error } = await svc.from('columns').update({ thumb_url: url }).eq('slug', slug);
    if (error) return NextResponse.json({ ok: false, slug, error: `DB更新失敗: ${error.message}` });
    return NextResponse.json({ ok: true, slug, thumb_url: url, model });
  } catch (e) {
    return NextResponse.json({ ok: false, slug, error: `保存例外: ${e instanceof Error ? e.message : 'unknown'}` });
  }
}
