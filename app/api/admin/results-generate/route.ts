// ご利用実績の画像を1件生成して保存（管理者のみ）。
// クライアントが index を 0..N-1 で順に呼ぶことで一括生成する（1件ずつなので時間制限に収まる）。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { generateImageOpenRouter } from '@/lib/openrouter-image';
import { RESULT_SCENES, buildResultPrompt, setResultUrl } from '@/lib/customer-results';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { index?: number };
  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index >= RESULT_SCENES.length) {
    return NextResponse.json({ ok: false, error: 'index が不正です' }, { status: 400 });
  }
  const s = RESULT_SCENES[index];

  const { image, diagnostic, model } = await generateImageOpenRouter(buildResultPrompt(s.scene));
  if (!image) return NextResponse.json({ ok: false, index, key: s.key, error: diagnostic || '画像生成に失敗しました', model });

  try {
    const svc = createServiceClient();
    const ext = image.contentType.includes('jpeg') ? 'jpg' : image.contentType.includes('webp') ? 'webp' : 'png';
    const path = `results/${s.key}.${ext}`;
    const up = await svc.storage
      .from('listing-images')
      .upload(path, image.buffer, { contentType: image.contentType, upsert: true, cacheControl: '86400' });
    if (up.error) return NextResponse.json({ ok: false, index, key: s.key, error: `アップロード失敗: ${up.error.message}` });
    const url = `${svc.storage.from('listing-images').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const saved = await setResultUrl(s.key, url);
    if (!saved.ok) return NextResponse.json({ ok: false, index, key: s.key, error: `保存失敗: ${saved.error}` });
    return NextResponse.json({ ok: true, index, key: s.key, label: s.label, url, model });
  } catch (e) {
    return NextResponse.json({ ok: false, index, key: s.key, error: `例外: ${e instanceof Error ? e.message : 'unknown'}` });
  }
}
