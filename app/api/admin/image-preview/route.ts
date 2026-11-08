// 画像だけをプレビュー生成する（記事は作らない・SNS投稿もしない）。管理者のみ。
// スタイル指示文や基準画像を試しながらブラッシュアップするために使う。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { generateImageOpenRouter } from '@/lib/openrouter-image';
import { getImageStyle, getImageRef } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SAMPLE_SUBJECT = 'a clean compact used car parked in front of a modern Japanese house on a sunny day';

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { subject?: string; style?: string; ref?: string };
  const style = (body.style && body.style.trim()) || (await getImageStyle());
  const subject = (body.subject && body.subject.trim()) || SAMPLE_SUBJECT;
  // ref は明示指定（空文字＝参照なし）を尊重。未指定（undefined）のときだけ保存値を使う。
  const ref = body.ref !== undefined ? body.ref.trim() : (await getImageRef()) ?? '';

  const prompt = `${style}\n\nDepict this specific scene: ${subject}.`;

  let img, diagnostic = '', model = '';
  try {
    const r = await generateImageOpenRouter(prompt, ref || undefined);
    img = r.image;
    diagnostic = r.diagnostic;
    model = r.model;
  } catch (e) {
    return NextResponse.json({ ok: false, error: `生成例外: ${e instanceof Error ? e.message : 'unknown'}` });
  }

  if (!img) return NextResponse.json({ ok: false, error: diagnostic || '画像生成に失敗しました', model });

  try {
    const svc = createServiceClient();
    const ext = img.contentType.includes('jpeg') ? 'jpg' : img.contentType.includes('webp') ? 'webp' : 'png';
    const path = `previews/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const up = await svc.storage
      .from('listing-images')
      .upload(path, img.buffer, { contentType: img.contentType, upsert: true, cacheControl: '3600' });
    if (up.error) return NextResponse.json({ ok: false, error: `アップロード失敗: ${up.error.message}`, model });
    const url = svc.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ ok: true, url, model });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `保存例外: ${e instanceof Error ? e.message : 'unknown'}`, model });
  }
}
