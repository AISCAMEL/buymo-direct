import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

// 正式査定フォームの写真アップロード（未ログインでも可）。
// service role で公開バケット listing-images の appraisals/ 配下へ保存し、公開URLを返す。
export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'ファイルを確認してください' }, { status: 400 });
  }

  const file = form.get('file');
  const sid = String(form.get('sid') ?? '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || randomUUID();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '画像サイズは8MBまでです' }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
  const path = `appraisals/${sid}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  try {
    const service = createServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await service.storage
      .from('listing-images')
      .upload(path, buffer, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) {
      return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
    }
    const { data: pub } = service.storage.from('listing-images').getPublicUrl(path);
    return NextResponse.json({ url: pub.publicUrl });
  } catch {
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}
