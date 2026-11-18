// ジャンルアイコンを1件生成して保存（管理者のみ）。
// クライアントが index を 0..N-1 で順に呼ぶことで一括生成する。
// index>0 では最初のアイコンを参照画像にしてスタイルを揃える。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { generateImageOpenRouter } from '@/lib/openrouter-image';
import { GENRE_ICONS, buildIconPrompt, getGenreIconMap, setGenreIconUrl } from '@/lib/genre-icons';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { index?: number };
  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index >= GENRE_ICONS.length) {
    return NextResponse.json({ ok: false, error: 'index が不正です' }, { status: 400 });
  }
  const g = GENRE_ICONS[index];

  // スタイル統一：2件目以降は先頭アイコンを参照画像にする
  let refUrl: string | undefined;
  if (index > 0) {
    const map = await getGenreIconMap();
    refUrl = map[GENRE_ICONS[0].key] || undefined;
  }

  const { image, diagnostic, model } = await generateImageOpenRouter(buildIconPrompt(g.scene), refUrl);
  if (!image) return NextResponse.json({ ok: false, index, key: g.key, error: diagnostic || '画像生成に失敗しました', model });

  try {
    const svc = createServiceClient();
    const ext = image.contentType.includes('jpeg') ? 'jpg' : image.contentType.includes('webp') ? 'webp' : 'png';
    const path = `genre-icons/${g.key}.${ext}`;
    const up = await svc.storage
      .from('listing-images')
      .upload(path, image.buffer, { contentType: image.contentType, upsert: true, cacheControl: '86400' });
    if (up.error) return NextResponse.json({ ok: false, index, key: g.key, error: `アップロード失敗: ${up.error.message}` });
    const url = `${svc.storage.from('listing-images').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const saved = await setGenreIconUrl(g.key, url);
    if (!saved.ok) return NextResponse.json({ ok: false, index, key: g.key, error: `保存失敗: ${saved.error}` });
    return NextResponse.json({ ok: true, index, key: g.key, label: g.label, url, model });
  } catch (e) {
    return NextResponse.json({ ok: false, index, key: g.key, error: `例外: ${e instanceof Error ? e.message : 'unknown'}` });
  }
}
