import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

// 正式査定フォームの写真アップロード（未ログインでも可）。
// service role で公開バケット listing-images の appraisals/ 配下へ保存し、公開URLを返す。
export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

/** 同一オリジンからのリクエストか（外部からの悪用を抑止）。 */
function isSameOrigin(req: Request): boolean {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return true; // 未設定（開発）時は許可
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? '';
  try {
    return !!origin && new URL(origin).host === new URL(site).host;
  } catch {
    return false;
  }
}

/** 先頭バイトが実際に画像形式か検証（拡張子偽装を防ぐ）。 */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WEBP: RIFF....WEBP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  // HEIC/HEIF: ....ftyp
  if (buf.toString('ascii', 4, 8) === 'ftyp') return true;
  return false;
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 });
  }

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

  let ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
  if (!ALLOWED_EXT.has(ext)) ext = 'jpg';
  const path = `appraisals/${sid}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  try {
    const service = createServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImage(buffer)) {
      return NextResponse.json({ error: '有効な画像ファイルではありません' }, { status: 400 });
    }
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
